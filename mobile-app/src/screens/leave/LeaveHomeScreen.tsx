import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

import {useAuthStore, useEmployee, useUser} from '../../store/authStore';
import {leaveApi} from '../../api/leaveApi';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import type {RootStackParamList, LeaveRequest} from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const leaveColors = [
  {color: '#EC4899', bg: '#FCE7F3'},
  {color: '#3B82F6', bg: '#DBEAFE'},
  {color: '#10B981', bg: '#D1FAE5'},
  {color: '#F59E0B', bg: '#FEF3C7'},
  {color: '#8B5CF6', bg: '#EDE9FE'},
  {color: '#06B6D4', bg: '#CFFAFE'},
];

export default function LeaveHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const employee = useEmployee();
  const user = useUser();
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  // Leave balances and requests use the same employee/user ID
  // Use employee._id if available, otherwise fallback to user's employeeId or user._id
  const effectiveEmployeeId = employee?._id || user?.employeeId || user?._id;

  const [activeTab, setActiveTab] = useState<'balance' | 'requests'>('balance');

  const {data: leaveBalance, isLoading: isLoadingBalance, refetch: refetchBalance} = useQuery({
    queryKey: ['leaveBalance', effectiveEmployeeId],
    queryFn: () => leaveApi.getLeaveBalance(effectiveEmployeeId || ''),
    enabled: !!effectiveEmployeeId,
    staleTime: 0, // Always consider data stale
    refetchOnMount: 'always', // Refetch on screen focus
  });

  const {data: leaveRequests, isLoading: isLoadingRequests, refetch: refetchRequests} = useQuery({
    queryKey: ['leaveRequests', effectiveEmployeeId],
    queryFn: () => leaveApi.getLeaveRequests({employeeId: effectiveEmployeeId, limit: 20}),
    enabled: !!effectiveEmployeeId,
    staleTime: 0, // Always consider data stale
    refetchOnMount: 'always', // Refetch on screen focus
  });

  const isLoading = isLoadingBalance || isLoadingRequests;

  // Refetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetchBalance();
      refetchRequests();
    }, [refetchBalance, refetchRequests])
  );

  const handleRefresh = () => {
    refetchBalance();
    refetchRequests();
  };

  const getStatusColor = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'approved':
        return {color: '#10B981', bg: '#D1FAE5'};
      case 'rejected':
        return {color: '#EF4444', bg: '#FEE2E2'};
      case 'pending':
        return {color: '#F59E0B', bg: '#FEF3C7'};
      case 'cancelled':
        return {color: '#6B7280', bg: '#F3F4F6'};
      default:
        return {color: '#6B7280', bg: '#F3F4F6'};
    }
  };

  const renderLeaveItem = ({item, index}: {item: LeaveRequest; index: number}) => {
    const statusColors = getStatusColor(item.status);
    const colorSet = leaveColors[index % leaveColors.length];
    const daysCount = item.days || item.totalDays || 1;
    const startDate = new Date(item.startDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
    const endDate = new Date(item.endDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});

    return (
      <TouchableOpacity
        style={[styles.leaveItem, {backgroundColor: colors.card}]}
        onPress={() => navigation.navigate('LeaveDetail', {leaveId: item._id})}>
        {/* Header: Leave Type & Status */}
        <View style={styles.leaveHeader}>
          <View style={[styles.leaveTypeIcon, {backgroundColor: colorSet.bg}]}>
            <Icon name="calendar-check-outline" size={20} color={colorSet.color} />
          </View>
          <Text style={[styles.leaveType, {color: colors.text}]} numberOfLines={1}>
            {item.leaveType?.name || item.leaveTypeId?.name || 'Leave'}
          </Text>
          <View style={[styles.statusBadge, {backgroundColor: statusColors.bg}]}>
            <Text style={[styles.statusText, {color: statusColors.color}]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Details Row */}
        <View style={styles.leaveDetails}>
          {/* Date */}
          <View style={styles.detailItem}>
            <Icon name="calendar-range" size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, {color: colors.textSecondary}]}>
              {item.startDate === item.endDate ? startDate : `${startDate} - ${endDate}`}
            </Text>
          </View>
          {/* Days */}
          <View style={[styles.daysBadge, {backgroundColor: colorSet.bg}]}>
            <Icon name="clock-outline" size={12} color={colorSet.color} />
            <Text style={[styles.daysText, {color: colorSet.color}]}>
              {daysCount} {daysCount === 1 ? 'Day' : 'Days'}
            </Text>
          </View>
        </View>

        {/* Reason */}
        {item.reason ? (
          <View style={styles.reasonRow}>
            <Icon name="note-text-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.reason, {color: colors.textSecondary}]} numberOfLines={1}>
              {item.reason}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} edges={['top']}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#EC4899', '#F472B6']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.headerGradient}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Leave</Text>
            <Text style={styles.headerSubtitle}>Manage your time off</Text>
          </View>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => navigation.navigate('ApplyLeave')}>
            <Icon name="plus" size={20} color="#EC4899" />
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={[styles.tabContainer, {backgroundColor: colors.card}]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'balance' && [styles.activeTab, {backgroundColor: colors.primary + '15'}],
          ]}
          onPress={() => setActiveTab('balance')}>
          <Icon
            name="wallet-outline"
            size={20}
            color={activeTab === 'balance' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {color: activeTab === 'balance' ? colors.primary : colors.textSecondary},
            ]}>
            Balance
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'requests' && [styles.activeTab, {backgroundColor: colors.primary + '15'}],
          ]}
          onPress={() => setActiveTab('requests')}>
          <Icon
            name="clipboard-text-outline"
            size={20}
            color={activeTab === 'requests' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {color: activeTab === 'requests' ? colors.primary : colors.textSecondary},
            ]}>
            Requests
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'balance' ? (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}>
          <View style={styles.balanceGrid}>
            {(leaveBalance?.data?.data?.balances || leaveBalance?.data?.balances || []).map((balance: any, index: number) => {
              const colorSet = leaveColors[index % leaveColors.length];
              return (
                <View
                  key={balance._id || index}
                  style={[styles.balanceCard, {backgroundColor: colors.card}]}>
                  <View style={[styles.balanceIconContainer, {backgroundColor: colorSet.bg}]}>
                    <Icon name="calendar-check-outline" size={24} color={colorSet.color} />
                  </View>
                  <Text style={[styles.balanceName, {color: colors.textSecondary}]}>
                    {balance.leaveType?.name || balance.leaveTypeId?.name || balance.leaveType || 'Leave'}
                  </Text>
                  <View style={styles.balanceRow}>
                    <Text style={[styles.balanceAvailable, {color: colorSet.color}]}>
                      {balance.balance ?? balance.available ?? balance.availableDays ?? 0}
                    </Text>
                    <Text style={[styles.balanceTotal, {color: colors.textSecondary}]}>
                      / {balance.entitled ?? balance.total ?? balance.totalDays ?? 0}
                    </Text>
                  </View>
                  <View style={styles.balanceDetails}>
                    <View style={[styles.balanceDetailItem, {backgroundColor: colorSet.bg}]}>
                      <Text style={[styles.balanceDetailValue, {color: colorSet.color}]}>
                        {balance.used ?? balance.usedDays ?? 0}
                      </Text>
                      <Text style={[styles.balanceDetailLabel, {color: colorSet.color}]}>Used</Text>
                    </View>
                    <View style={[styles.balanceDetailItem, {backgroundColor: '#FEF3C7'}]}>
                      <Text style={[styles.balanceDetailValue, {color: '#F59E0B'}]}>
                        {balance.pending ?? balance.pendingDays ?? 0}
                      </Text>
                      <Text style={[styles.balanceDetailLabel, {color: '#F59E0B'}]}>Pending</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
          <View style={styles.bottomPadding} />
        </ScrollView>
      ) : (
        <FlatList
          data={leaveRequests?.data?.data?.leaves || leaveRequests?.data?.leaves || leaveRequests?.data?.records || []}
          renderItem={renderLeaveItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconContainer, {backgroundColor: '#FCE7F3'}]}>
                <Icon name="calendar-blank" size={48} color="#EC4899" />
              </View>
              <Text style={[styles.emptyText, {color: colors.text}]}>No leave requests</Text>
              <Text style={[styles.emptySubtext, {color: colors.textSecondary}]}>
                Your leave requests will appear here
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: FontSizes.md,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  applyButtonText: {
    color: '#EC4899',
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.md,
    marginBottom: Spacing.lg,
    padding: 4,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  activeTab: {},
  tabText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  balanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  balanceCard: {
    width: '48%',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  balanceName: {
    fontSize: FontSizes.sm,
    marginBottom: Spacing.xs,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.md,
  },
  balanceAvailable: {
    fontSize: 32,
    fontWeight: '700',
  },
  balanceTotal: {
    fontSize: FontSizes.md,
  },
  balanceDetails: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  balanceDetailItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  balanceDetailValue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  balanceDetailLabel: {
    fontSize: FontSizes.xs,
  },
  listContent: {
    padding: Spacing.lg,
  },
  leaveItem: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  leaveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  leaveTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  leaveType: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  leaveDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: FontSizes.sm,
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  daysText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: 4,
  },
  reason: {
    fontSize: FontSizes.sm,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontSize: FontSizes.md,
  },
  bottomPadding: {
    height: Spacing.xl,
  },
});
