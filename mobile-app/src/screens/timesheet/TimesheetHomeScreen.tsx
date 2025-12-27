import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

import {useAuthStore, useEmployee, useUser} from '../../store/authStore';
import {attendanceApi} from '../../api/attendanceApi';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';

// Helper to get week dates
const getWeekDates = (date: Date) => {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {start: monday, end: sunday};
};

// Helper to format currency
const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '\u20AC',
    GBP: '\u00A3',
    INR: '\u20B9',
    JPY: '\u00A5',
  };
  const symbol = symbols[currency] || currency;
  return `${symbol}${amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
};

export default function TimesheetHomeScreen() {
  const navigation = useNavigation();
  const employee = useEmployee();
  const user = useUser();
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  // Get effective employee ID
  const effectiveId = employee?._id || user?.employeeId || user?._id;

  // Get current week and month
  const [selectedDate] = useState(new Date());
  const currentMonth = selectedDate.getMonth() + 1;
  const currentYear = selectedDate.getFullYear();
  const weekDates = getWeekDates(new Date());

  // Fetch attendance summary for current month
  const {data: summaryData, isLoading: isLoadingSummary, refetch: refetchSummary} = useQuery({
    queryKey: ['attendanceSummary', effectiveId, currentMonth, currentYear],
    queryFn: () => attendanceApi.getAttendanceSummary(currentMonth, currentYear, effectiveId),
    enabled: !!effectiveId,
  });

  // Fetch attendance records for current month
  const {data: attendanceData, isLoading: isLoadingAttendance, refetch: refetchAttendance} = useQuery({
    queryKey: ['attendanceHistory', effectiveId, currentMonth, currentYear],
    queryFn: () => attendanceApi.getAttendance({
      employeeId: effectiveId,
      startDate: new Date(currentYear, currentMonth - 1, 1).toISOString(),
      endDate: new Date(currentYear, currentMonth, 0).toISOString(),
      limit: 50,
    }),
    enabled: !!effectiveId,
  });

  const isLoading = isLoadingSummary || isLoadingAttendance;

  const handleRefresh = () => {
    refetchSummary();
    refetchAttendance();
  };

  // Parse data from API responses
  const summary = summaryData?.data?.data?.summary || summaryData?.data?.summary || {};
  const records = attendanceData?.data?.data?.records || attendanceData?.data?.records || [];

  // Calculate timesheet data from attendance
  const totalHours = summary?.totalWorkHours || 0;
  const overtimeHours = summary?.totalOvertimeHours || 0;
  const regularHours = totalHours - overtimeHours;
  const presentDays = summary?.present || 0;
  const halfDays = summary?.halfDay || 0;

  // Get salary data for earnings calculation
  const salary = employee?.salary;
  const hourlyRate = salary ? (salary.basic + (salary.hra || 0) + (salary.allowances || 0)) / (22 * 8) : 0;
  const totalEarnings = totalHours * hourlyRate;
  const currency = salary?.currency || 'INR';

  // Group attendance records by week
  const weeklyRecords = records.filter((record: any) => {
    const recordDate = new Date(record.date);
    return recordDate >= weekDates.start && recordDate <= weekDates.end;
  });

  const currentWeekHours = weeklyRecords.reduce((sum: number, record: any) => sum + (record.workHours || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return colors.success;
      case 'late': return colors.warning;
      case 'half_day': return colors.info;
      case 'absent': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'present': return '#D1FAE5';
      case 'late': return '#FEF3C7';
      case 'half_day': return '#DBEAFE';
      case 'absent': return '#FEE2E2';
      default: return colors.surfaceVariant;
    }
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Timesheet</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}>

        {/* Monthly Summary Card */}
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIconContainer}>
              <Icon name="clock-outline" size={24} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.summaryTitle}>
                {new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}
              </Text>
              <Text style={styles.summarySubtitle}>Monthly Timesheet</Text>
            </View>
          </View>

          <View style={styles.summaryStats}>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>{totalHours.toFixed(1)}h</Text>
              <Text style={styles.summaryStatLabel}>Total Hours</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>{regularHours.toFixed(1)}h</Text>
              <Text style={styles.summaryStatLabel}>Regular</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>{overtimeHours.toFixed(1)}h</Text>
              <Text style={styles.summaryStatLabel}>Overtime</Text>
            </View>
          </View>

          {salary && (
            <View style={styles.earningsRow}>
              <Icon name="wallet-outline" size={18} color="rgba(255,255,255,0.8)" />
              <Text style={styles.earningsText}>
                Earnings: {formatCurrency(totalEarnings, currency)}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Attendance Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, {backgroundColor: colors.card}]}>
            <View style={[styles.statIconContainer, {backgroundColor: '#D1FAE5'}]}>
              <Icon name="check-circle" size={20} color="#10B981" />
            </View>
            <Text style={[styles.statValue, {color: colors.text}]}>{presentDays}</Text>
            <Text style={[styles.statLabel, {color: colors.textSecondary}]}>Present</Text>
          </View>
          <View style={[styles.statCard, {backgroundColor: colors.card}]}>
            <View style={[styles.statIconContainer, {backgroundColor: '#DBEAFE'}]}>
              <Icon name="clock-alert" size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.statValue, {color: colors.text}]}>{halfDays}</Text>
            <Text style={[styles.statLabel, {color: colors.textSecondary}]}>Half Days</Text>
          </View>
          <View style={[styles.statCard, {backgroundColor: colors.card}]}>
            <View style={[styles.statIconContainer, {backgroundColor: '#FEF3C7'}]}>
              <Icon name="clock-plus-outline" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.statValue, {color: colors.text}]}>{overtimeHours.toFixed(1)}h</Text>
            <Text style={[styles.statLabel, {color: colors.textSecondary}]}>Overtime</Text>
          </View>
        </View>

        {/* Current Week */}
        <View style={[styles.weekCard, {backgroundColor: colors.card}]}>
          <View style={styles.weekHeader}>
            <View style={styles.weekTitleRow}>
              <View style={[styles.weekIconContainer, {backgroundColor: '#EDE9FE'}]}>
                <Icon name="calendar-week" size={20} color="#8B5CF6" />
              </View>
              <Text style={[styles.weekTitle, {color: colors.text}]}>Current Week</Text>
            </View>
            <Text style={[styles.weekHours, {color: colors.primary}]}>{currentWeekHours.toFixed(1)}h</Text>
          </View>
          <Text style={[styles.weekDateRange, {color: colors.textSecondary}]}>
            {weekDates.start.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - {weekDates.end.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}
          </Text>
        </View>

        {/* Time Entries */}
        <View style={styles.entriesSection}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>Time Entries</Text>

          {records.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="clock-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, {color: colors.textSecondary}]}>No attendance records this month</Text>
              <Text style={[styles.emptySubtext, {color: colors.textDisabled}]}>
                Check in to start tracking your time
              </Text>
            </View>
          ) : (
            records.map((record: any, index: number) => (
              <View
                key={record._id || index}
                style={[styles.entryCard, {backgroundColor: colors.card, borderColor: colors.cardBorder}]}>
                <View style={[styles.entryDateContainer, {backgroundColor: getStatusBg(record.status)}]}>
                  <Text style={[styles.entryDay, {color: getStatusColor(record.status)}]}>
                    {new Date(record.date).getDate()}
                  </Text>
                  <Text style={[styles.entryMonth, {color: getStatusColor(record.status)}]}>
                    {new Date(record.date).toLocaleDateString('en-US', {month: 'short'})}
                  </Text>
                </View>

                <View style={styles.entryDetails}>
                  <View style={styles.entryTimeRow}>
                    <View style={styles.entryTimeItem}>
                      <Icon name="login" size={14} color={colors.success} />
                      <Text style={[styles.entryTimeText, {color: colors.text}]}>
                        {record.checkIn
                          ? new Date(record.checkIn).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})
                          : '--:--'}
                      </Text>
                    </View>
                    <Icon name="arrow-right" size={14} color={colors.textSecondary} />
                    <View style={styles.entryTimeItem}>
                      <Icon name="logout" size={14} color={colors.error} />
                      <Text style={[styles.entryTimeText, {color: colors.text}]}>
                        {record.checkOut
                          ? new Date(record.checkOut).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})
                          : '--:--'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, {backgroundColor: getStatusBg(record.status)}]}>
                    <Text style={[styles.statusText, {color: getStatusColor(record.status)}]}>
                      {record.status?.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.entryHoursContainer}>
                  <Text style={[styles.entryHours, {color: colors.primary}]}>
                    {(record.workHours || 0).toFixed(1)}h
                  </Text>
                  {salary && (
                    <Text style={[styles.entryEarnings, {color: colors.success}]}>
                      {formatCurrency((record.workHours || 0) * hourlyRate, currency)}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  summaryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  summaryTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summarySubtitle: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  summaryStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryStatValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryStatLabel: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  summaryStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  earningsText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FontSizes.xs,
  },
  weekCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  weekTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  weekHours: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  weekDateRange: {
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs,
    marginLeft: 48,
  },
  entriesSection: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  entryDateContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  entryDay: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  entryMonth: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  entryDetails: {
    flex: 1,
  },
  entryTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  entryTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entryTimeText: {
    fontSize: FontSizes.sm,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  entryHoursContainer: {
    alignItems: 'flex-end',
  },
  entryHours: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  entryEarnings: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSizes.md,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs,
  },
  bottomPadding: {
    height: Spacing.xxl,
  },
});
