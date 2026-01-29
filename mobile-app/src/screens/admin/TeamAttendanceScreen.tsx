import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DatePicker from 'react-native-date-picker';

import {useAuthStore} from '../../store/authStore';
import {adminApi, EmployeeAttendanceStatus} from '../../api/adminApi';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import AppHeader, {HeaderGradients} from '../../components/AppHeader';

type StatusFilter = 'all' | 'present' | 'absent' | 'late' | 'on_leave';

const statusColors: Record<string, {color: string; bg: string; label: string}> = {
  present: {color: '#10B981', bg: '#D1FAE5', label: 'Present'},
  absent: {color: '#EF4444', bg: '#FEE2E2', label: 'Absent'},
  late: {color: '#F59E0B', bg: '#FEF3C7', label: 'Late'},
  half_day: {color: '#8B5CF6', bg: '#EDE9FE', label: 'Half Day'},
  on_leave: {color: '#3B82F6', bg: '#DBEAFE', label: 'On Leave'},
  holiday: {color: '#6366F1', bg: '#EEF2FF', label: 'Holiday'},
  weekend: {color: '#64748B', bg: '#F1F5F9', label: 'Weekend'},
};

interface AttendanceItemProps {
  item: EmployeeAttendanceStatus;
}

function AttendanceItem({item}: AttendanceItemProps) {
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;
  const status = statusColors[item.status] || statusColors.absent;

  const formatTime = (time?: string) => {
    if (!time) return '--:--';
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={[styles.attendanceItem, {backgroundColor: colors.card}]}>
      <View style={styles.employeeInfo}>
        <View style={[styles.avatar, {backgroundColor: colors.primary + '20'}]}>
          <Text style={[styles.avatarText, {color: colors.primary}]}>
            {item.employee.firstName.charAt(0)}{item.employee.lastName.charAt(0)}
          </Text>
        </View>
        <View style={styles.employeeDetails}>
          <Text style={[styles.employeeName, {color: colors.text}]}>
            {item.employee.firstName} {item.employee.lastName}
          </Text>
          <Text style={[styles.employeeCode, {color: colors.textSecondary}]}>
            {item.employee.employeeCode}
            {item.employee.department && ` - ${item.employee.department}`}
          </Text>
        </View>
      </View>

      <View style={styles.attendanceInfo}>
        <View style={styles.timeRow}>
          <View style={styles.timeItem}>
            <Icon name="login" size={14} color={item.checkIn ? '#10B981' : colors.textDisabled} />
            <Text style={[styles.timeText, {color: item.checkIn ? colors.text : colors.textDisabled}]}>
              {formatTime(item.checkIn)}
            </Text>
          </View>
          <View style={styles.timeDivider} />
          <View style={styles.timeItem}>
            <Icon name="logout" size={14} color={item.checkOut ? '#EF4444' : colors.textDisabled} />
            <Text style={[styles.timeText, {color: item.checkOut ? colors.text : colors.textDisabled}]}>
              {formatTime(item.checkOut)}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, {backgroundColor: status.bg}]}>
          <Text style={[styles.statusText, {color: status.color}]}>{status.label}</Text>
        </View>
      </View>

      {item.workHours !== undefined && item.workHours > 0 && (
        <View style={styles.workHoursRow}>
          <Icon name="clock-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.workHoursText, {color: colors.textSecondary}]}>
            {item.workHours.toFixed(1)} hrs
            {item.overtimeHours && item.overtimeHours > 0 && (
              <Text style={{color: '#F59E0B'}}> (+{item.overtimeHours.toFixed(1)} OT)</Text>
            )}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function TeamAttendanceScreen() {
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Fetch team attendance
  const {
    data: attendanceData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['teamAttendance', selectedDate.toISOString().split('T')[0]],
    queryFn: () => adminApi.getTeamAttendance({date: selectedDate.toISOString().split('T')[0]}),
    staleTime: 30000,
  });

  const summary = attendanceData?.data;
  const employees = summary?.employees || [];

  // Filter employees by status
  const filteredEmployees = employees.filter(emp => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'present') return emp.status === 'present' || emp.status === 'late';
    return emp.status === statusFilter;
  });

  const renderHeader = () => (
    <View>
      {/* Date Selector */}
      <TouchableOpacity
        style={[styles.dateSelector, {backgroundColor: colors.card}]}
        onPress={() => setShowDatePicker(true)}>
        <Icon name="calendar" size={20} color={colors.primary} />
        <Text style={[styles.dateText, {color: colors.text}]}>
          {selectedDate.toLocaleDateString('en-US', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
        <Icon name="chevron-down" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, {backgroundColor: '#D1FAE5'}]}>
          <Text style={[styles.summaryValue, {color: '#10B981'}]}>{summary?.present || 0}</Text>
          <Text style={[styles.summaryLabel, {color: '#059669'}]}>Present</Text>
        </View>
        <View style={[styles.summaryCard, {backgroundColor: '#FEE2E2'}]}>
          <Text style={[styles.summaryValue, {color: '#EF4444'}]}>{summary?.absent || 0}</Text>
          <Text style={[styles.summaryLabel, {color: '#DC2626'}]}>Absent</Text>
        </View>
        <View style={[styles.summaryCard, {backgroundColor: '#FEF3C7'}]}>
          <Text style={[styles.summaryValue, {color: '#F59E0B'}]}>{summary?.late || 0}</Text>
          <Text style={[styles.summaryLabel, {color: '#D97706'}]}>Late</Text>
        </View>
        <View style={[styles.summaryCard, {backgroundColor: '#DBEAFE'}]}>
          <Text style={[styles.summaryValue, {color: '#3B82F6'}]}>{summary?.onLeave || 0}</Text>
          <Text style={[styles.summaryLabel, {color: '#2563EB'}]}>Leave</Text>
        </View>
      </View>

      {/* Status Filter */}
      <View style={styles.filterRow}>
        {(['all', 'present', 'absent', 'late', 'on_leave'] as StatusFilter[]).map(filter => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              {
                backgroundColor: statusFilter === filter ? colors.primary : colors.card,
                borderColor: statusFilter === filter ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setStatusFilter(filter)}>
            <Text
              style={[
                styles.filterChipText,
                {color: statusFilter === filter ? '#FFFFFF' : colors.textSecondary},
              ]}>
              {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1).replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Total Count */}
      <View style={styles.countRow}>
        <Text style={[styles.countText, {color: colors.textSecondary}]}>
          Showing {filteredEmployees.length} of {summary?.total || 0} employees
        </Text>
      </View>
    </View>
  );

  const renderItem = useCallback(
    ({item}: {item: EmployeeAttendanceStatus}) => <AttendanceItem item={item} />,
    []
  );

  const keyExtractor = useCallback((item: EmployeeAttendanceStatus) => item.employeeId, []);

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <AppHeader
        title="Team Attendance"
        subtitle={`${summary?.total || 0} Employees`}
        gradientColors={HeaderGradients.attendance}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, {color: colors.textSecondary}]}>
            Loading attendance...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredEmployees}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Icon name="account-clock-outline" size={64} color={colors.textDisabled} />
              <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
                No attendance records found
              </Text>
            </View>
          )}
        />
      )}

      <DatePicker
        modal
        open={showDatePicker}
        date={selectedDate}
        mode="date"
        maximumDate={new Date()}
        onConfirm={(date) => {
          setShowDatePicker(false);
          setSelectedDate(date);
        }}
        onCancel={() => setShowDatePicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  dateText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginHorizontal: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginHorizontal: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  filterChipText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  countRow: {
    marginBottom: Spacing.md,
  },
  countText: {
    fontSize: FontSizes.sm,
  },
  attendanceItem: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  employeeCode: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  attendanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    marginLeft: 4,
  },
  timeDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
    marginHorizontal: Spacing.md,
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
  workHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  workHoursText: {
    fontSize: FontSizes.sm,
    marginLeft: 4,
  },
  separator: {
    height: Spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyText: {
    fontSize: FontSizes.md,
    marginTop: Spacing.md,
  },
});
