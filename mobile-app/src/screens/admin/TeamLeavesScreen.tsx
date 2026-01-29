import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAuthStore} from '../../store/authStore';
import {adminApi} from '../../api/adminApi';
import {Colors} from '../../theme/colors';
import AppHeader, {HeaderGradients} from '../../components/AppHeader';
import type {LeaveRequest} from '../../types';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_CONFIG: Record<string, {color: string; bg: string; label: string}> = {
  pending: {color: '#F59E0B', bg: '#FEF3C7', label: 'Pending'},
  approved: {color: '#10B981', bg: '#D1FAE5', label: 'Approved'},
  rejected: {color: '#EF4444', bg: '#FEE2E2', label: 'Rejected'},
  cancelled: {color: '#64748B', bg: '#F1F5F9', label: 'Cancelled'},
};

export default function TeamLeavesScreen() {
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {data, isLoading, refetch} = useQuery({
    queryKey: ['teamLeaves', statusFilter],
    queryFn: () => adminApi.getLeaveRequests({
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
  });

  const leaves: LeaveRequest[] = Array.isArray(data?.data?.requests) ? data.data.requests : [];

  const handleApprove = (leaveId: string) => {
    Alert.alert('Approve Leave', 'Are you sure?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Approve',
        onPress: async () => {
          setIsSubmitting(true);
          try {
            await adminApi.approveLeave(leaveId);
            Alert.alert('Success', 'Leave approved');
            refetch();
          } catch {
            Alert.alert('Error', 'Failed to approve');
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

  const handleRejectPress = (leaveId: string) => {
    setSelectedLeaveId(leaveId);
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedLeaveId) return;
    setIsSubmitting(true);
    try {
      await adminApi.rejectLeave(selectedLeaveId, rejectionReason || undefined);
      Alert.alert('Success', 'Leave rejected');
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedLeaveId(null);
      refetch();
    } catch {
      Alert.alert('Error', 'Failed to reject');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {day: 'numeric', month: 'short'});
    } catch {
      return dateStr;
    }
  };

  const renderLeaveCard = ({item}: {item: LeaveRequest}) => {
    const statusConfig = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
    const employeeName = item.employee
      ? `${item.employee.firstName ?? ''} ${item.employee.lastName ?? ''}`.trim() || 'Unknown'
      : 'Unknown Employee';
    const leaveTypeName =
      typeof item.leaveTypeId === 'object' && item.leaveTypeId
        ? (item.leaveTypeId as {name?: string}).name ?? 'Leave'
        : item.leaveType?.name ?? 'Leave';
    const days = item.days ?? item.totalDays ?? 1;

    return (
      <View style={[styles.card, {backgroundColor: colors.card}]}>
        <View style={styles.cardHeader}>
          <View style={styles.employeeRow}>
            <View style={[styles.avatar, {backgroundColor: colors.primary + '20'}]}>
              <Text style={[styles.avatarText, {color: colors.primary}]}>
                {employeeName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.employeeInfo}>
              <Text style={[styles.employeeName, {color: colors.text}]}>{employeeName}</Text>
              <Text style={[styles.leaveType, {color: colors.textSecondary}]}>{leaveTypeName}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, {backgroundColor: statusConfig.bg}]}>
            <Text style={[styles.statusText, {color: statusConfig.color}]}>{statusConfig.label}</Text>
          </View>
        </View>

        <View style={[styles.dateRow, {borderTopColor: colors.border}]}>
          <Icon name="calendar-range" size={16} color={colors.textSecondary} />
          <Text style={[styles.dateText, {color: colors.textSecondary}]}>
            {formatDate(item.startDate)} - {formatDate(item.endDate)} ({days} day{days !== 1 ? 's' : ''})
          </Text>
        </View>

        {item.reason ? (
          <Text style={[styles.reason, {color: colors.textSecondary}]} numberOfLines={2}>
            "{item.reason}"
          </Text>
        ) : null}

        {item.status === 'pending' ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, {backgroundColor: '#EF4444'}]}
              onPress={() => handleRejectPress(item._id)}
              disabled={isSubmitting}>
              <Icon name="close" size={16} color="#FFF" />
              <Text style={styles.actionText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, {backgroundColor: '#10B981'}]}
              onPress={() => handleApprove(item._id)}
              disabled={isSubmitting}>
              <Icon name="check" size={16} color="#FFF" />
              <Text style={styles.actionText}>Approve</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  const renderFilters = () => (
    <View style={styles.filters}>
      {(['pending', 'approved', 'rejected', 'all'] as StatusFilter[]).map(filter => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.filterBtn,
            {
              backgroundColor: statusFilter === filter ? colors.primary : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setStatusFilter(filter)}>
          <Text
            style={[
              styles.filterText,
              {color: statusFilter === filter ? '#FFF' : colors.textSecondary},
            ]}>
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <AppHeader title="Leave Requests" gradientColors={HeaderGradients.leave} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <AppHeader
        title="Leave Requests"
        subtitle={`${leaves.length || 0} Total`}
        gradientColors={HeaderGradients.leave}
      />

      {renderFilters()}

      <FlatList
        data={leaves}
        keyExtractor={(item, idx) => item._id ?? String(idx)}
        renderItem={renderLeaveCard}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} />}
        ItemSeparatorComponent={() => <View style={{height: 12}} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="calendar-check" size={48} color={colors.textDisabled} />
            <Text style={[styles.emptyText, {color: colors.textSecondary}]}>No leave requests</Text>
          </View>
        }
      />

      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {backgroundColor: colors.card}]}>
            <Text style={[styles.modalTitle, {color: colors.text}]}>Reject Leave</Text>
            <TextInput
              style={[styles.input, {backgroundColor: colors.background, borderColor: colors.border, color: colors.text}]}
              placeholder="Reason (optional)"
              placeholderTextColor={colors.textDisabled}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, {borderColor: colors.border}]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedLeaveId(null);
                }}>
                <Text style={{color: colors.textSecondary}}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, {backgroundColor: '#EF4444', borderColor: '#EF4444'}]}
                onPress={handleRejectConfirm}
                disabled={isSubmitting}>
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={{color: '#FFF'}}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  loading: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  filters: {flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12},
  filterBtn: {flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', marginHorizontal: 4, borderWidth: 1},
  filterText: {fontSize: 12, fontWeight: '600'},
  list: {padding: 16, paddingTop: 4},
  card: {padding: 16, borderRadius: 12, elevation: 2},
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  employeeRow: {flexDirection: 'row', alignItems: 'center', flex: 1},
  avatar: {width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10},
  avatarText: {fontSize: 14, fontWeight: '700'},
  employeeInfo: {flex: 1},
  employeeName: {fontSize: 14, fontWeight: '600'},
  leaveType: {fontSize: 12, marginTop: 2},
  statusBadge: {paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4},
  statusText: {fontSize: 10, fontWeight: '600'},
  dateRow: {flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1},
  dateText: {fontSize: 12, marginLeft: 6},
  reason: {fontSize: 12, fontStyle: 'italic', marginTop: 8},
  actions: {flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8},
  actionBtn: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 4},
  actionText: {color: '#FFF', fontSize: 12, fontWeight: '600'},
  empty: {alignItems: 'center', paddingVertical: 40},
  emptyText: {fontSize: 14, marginTop: 12},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24},
  modalContent: {padding: 20, borderRadius: 16},
  modalTitle: {fontSize: 18, fontWeight: '700', marginBottom: 16},
  input: {borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: 'top'},
  modalActions: {flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12},
  modalBtn: {paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, borderWidth: 1},
});
