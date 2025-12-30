import React, {useCallback} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute, useFocusEffect} from '@react-navigation/native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAuthStore} from '../../store/authStore';
import {leaveApi} from '../../api/leaveApi';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import {showDialog} from '../../utils/alert';

export default function LeaveDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;
  const {leaveId} = route.params;

  const {data: leave, isLoading, isError, refetch} = useQuery({
    queryKey: ['leaveRequest', leaveId],
    queryFn: () => leaveApi.getLeaveRequestById(leaveId),
    enabled: !!leaveId,
    staleTime: 0, // Always consider data stale to fetch fresh data
    refetchOnMount: 'always', // Refetch whenever component mounts
  });

  // Refetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const cancelMutation = useMutation({
    mutationFn: () => leaveApi.cancelLeaveRequest(leaveId),
    onSuccess: () => {
      // Invalidate both the detail and list queries to update the status
      queryClient.invalidateQueries({queryKey: ['leaveRequest', leaveId]});
      queryClient.invalidateQueries({queryKey: ['leaveRequests']});
      queryClient.invalidateQueries({queryKey: ['leaveBalance']});
      showDialog.success('Success', 'Leave request cancelled', () => navigation.goBack());
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return colors.success;
      case 'rejected': return colors.error;
      case 'pending': return colors.warning;
      case 'cancelled': return colors.textSecondary;
      default: return colors.textSecondary;
    }
  };

  // API returns {success: true, data: {leaveRequest: {...}}}
  // leaveApi.getLeaveRequestById returns response.data which is { success, data: { leaveRequest } }
  const request = leave?.data?.leaveRequest || leave?.data;

  // Get leave type name - handle both populated object and plain ObjectId
  const getLeaveTypeName = () => {
    if (!request) return 'Leave';
    // If leaveTypeId is populated with name
    if (typeof request.leaveTypeId === 'object' && request.leaveTypeId?.name) {
      return request.leaveTypeId.name;
    }
    // Fallback to leaveType property if it exists
    if (request.leaveType?.name) {
      return request.leaveType.name;
    }
    return 'Leave';
  };

  // Format date safely
  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'N/A';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Leave Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, {color: colors.textSecondary}]}>Loading...</Text>
          </View>
        ) : isError ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle-outline" size={48} color={colors.error} />
            <Text style={[styles.errorText, {color: colors.error}]}>Failed to load leave details</Text>
          </View>
        ) : request ? (
          <>
            <View style={[styles.card, {backgroundColor: colors.card, borderColor: colors.cardBorder}]}>
              <View style={styles.row}>
                <Text style={[styles.label, {color: colors.textSecondary}]}>Leave Type</Text>
                <Text style={[styles.value, {color: colors.text}]}>{getLeaveTypeName()}</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, {color: colors.textSecondary}]}>Status</Text>
                <View style={[styles.statusBadge, {backgroundColor: getStatusColor(request.status || 'pending') + '20'}]}>
                  <Text style={[styles.statusText, {color: getStatusColor(request.status || 'pending')}]}>
                    {(request.status || 'pending').toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, {color: colors.textSecondary}]}>Duration</Text>
                <Text style={[styles.value, {color: colors.text}]}>{request.days || request.totalDays || 1} {(request.days || request.totalDays || 1) === 1 ? 'Day' : 'Days'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, {color: colors.textSecondary}]}>Dates</Text>
                <Text style={[styles.value, {color: colors.text}]}>
                  {formatDate(request.startDate)}{request.startDate !== request.endDate ? ` - ${formatDate(request.endDate)}` : ''}
                </Text>
              </View>
            </View>

            {/* Reason Section */}
            <View style={[styles.reasonCard, {backgroundColor: colors.card, borderColor: colors.cardBorder}]}>
              <View style={styles.reasonHeader}>
                <Icon name="note-text-outline" size={18} color={colors.primary} />
                <Text style={[styles.reasonTitle, {color: colors.text}]}>Reason</Text>
              </View>
              <Text style={[styles.reasonText, {color: colors.textSecondary}]}>
                {request.reason || 'No reason provided'}
              </Text>
            </View>

            {/* Rejection Reason Section */}
            {request.status === 'rejected' && request.rejectionReason && (
              <View style={[styles.rejectionCard, {backgroundColor: colors.error + '10', borderColor: colors.error + '30'}]}>
                <View style={styles.reasonHeader}>
                  <Icon name="close-circle-outline" size={18} color={colors.error} />
                  <Text style={[styles.reasonTitle, {color: colors.error}]}>Rejection Reason</Text>
                </View>
                <Text style={[styles.reasonText, {color: colors.error}]}>
                  {request.rejectionReason}
                </Text>
              </View>
            )}

            {request.status === 'pending' && (
              <TouchableOpacity
                style={[styles.cancelButton, {borderColor: colors.error}]}
                onPress={() => cancelMutation.mutate()}>
                <Text style={[styles.cancelButtonText, {color: colors.error}]}>Cancel Request</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Icon name="file-document-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.errorText, {color: colors.textSecondary}]}>No leave details found</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {fontSize: FontSizes.lg, fontWeight: '600'},
  headerSpacer: {width: 24},
  content: {flex: 1, padding: Spacing.lg},
  card: {padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1},
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md},
  label: {fontSize: FontSizes.md},
  value: {fontSize: FontSizes.md, fontWeight: '600', flex: 1, textAlign: 'right'},
  statusBadge: {paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.xs},
  statusText: {fontSize: FontSizes.sm, fontWeight: '600'},
  reasonCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  rejectionCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  reasonTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  reasonText: {
    fontSize: FontSizes.md,
    lineHeight: 22,
  },
  cancelButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {fontSize: FontSizes.md, fontWeight: '600'},
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  loadingText: {
    fontSize: FontSizes.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  errorText: {
    fontSize: FontSizes.md,
    marginTop: Spacing.md,
  },
});
