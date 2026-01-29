import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

import {useAuthStore} from '../../store/authStore';
import {adminApi} from '../../api/adminApi';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import AppHeader, {HeaderGradients} from '../../components/AppHeader';

type RouteParams = {
  EmployeeSalaryDetail: {
    employeeId: string;
  };
};

// Helper function to format currency - defaults to INR (Hermes-safe)
const formatCurrency = (amount: number, _currency: string = 'INR'): string => {
  const num = Number(amount);
  if (!isFinite(num) || isNaN(num)) {
    return '0';
  }
  const absNum = Math.abs(Math.round(num));
  const numStr = absNum.toString();
  let result = '';
  const len = numStr.length;

  if (len <= 3) {
    result = numStr;
  } else {
    result = numStr.slice(-3);
    let remaining = numStr.slice(0, -3);
    while (remaining.length > 0) {
      const chunk = remaining.slice(-2);
      result = chunk + ',' + result;
      remaining = remaining.slice(0, -2);
    }
  }

  return num < 0 ? `-${result}` : result;
};

export default function EmployeeSalaryDetailScreen() {
  const route = useRoute<RouteProp<RouteParams, 'EmployeeSalaryDetail'>>();
  const {employeeId} = route.params;

  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Fetch employee salary details
  const {
    data: salaryData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['employeeSalary', employeeId, currentMonth, currentYear],
    queryFn: () => adminApi.getEmployeeSalaryDetails(employeeId, currentMonth, currentYear),
    staleTime: 60000,
  });

  const salary = salaryData?.data;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const progressPercent = salary && salary.workingDays > 0
    ? Math.min(100, (salary.daysWorked / salary.workingDays) * 100)
    : 0;

  const dailyRate = salary?.netSalary && salary?.workingDays
    ? salary.netSalary / salary.workingDays
    : 0;

  if (isLoading) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <AppHeader
          title="Employee Salary"
          gradientColors={HeaderGradients.payroll}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, {color: colors.textSecondary}]}>
            Loading salary details...
          </Text>
        </View>
      </View>
    );
  }

  if (!salary) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <AppHeader
          title="Employee Salary"
          gradientColors={HeaderGradients.payroll}
        />
        <View style={styles.emptyContainer}>
          <Icon name="account-cash-outline" size={64} color={colors.textDisabled} />
          <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
            No salary data found for this employee
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <AppHeader
        title={`${salary.employee.firstName} ${salary.employee.lastName}`}
        subtitle={salary.employee.employeeCode}
        gradientColors={HeaderGradients.payroll}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }>

        {/* Employee Info Card */}
        <View style={[styles.employeeCard, {backgroundColor: colors.card}]}>
          <View style={[styles.avatar, {backgroundColor: colors.primary + '20'}]}>
            <Text style={[styles.avatarText, {color: colors.primary}]}>
              {salary.employee.firstName.charAt(0)}{salary.employee.lastName.charAt(0)}
            </Text>
          </View>
          <View style={styles.employeeInfo}>
            <Text style={[styles.employeeName, {color: colors.text}]}>
              {salary.employee.firstName} {salary.employee.lastName}
            </Text>
            <Text style={[styles.employeeCode, {color: colors.textSecondary}]}>
              {salary.employee.employeeCode}
            </Text>
            {salary.employee.department && (
              <Text style={[styles.employeeDept, {color: colors.textSecondary}]}>
                {salary.employee.department}
                {salary.employee.designation && ` - ${salary.employee.designation}`}
              </Text>
            )}
          </View>
        </View>

        {/* Current Earnings Card */}
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <View style={styles.earningsIconContainer}>
              <Icon name="wallet-outline" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.earningsHeaderText}>
              <Text style={styles.earningsTitle}>Current Earnings</Text>
              <Text style={styles.earningsSubtitle}>
                {monthNames[currentMonth - 1]} {currentYear}
              </Text>
            </View>
          </View>

          <View style={styles.earningsMainAmount}>
            <Text style={styles.earningsAmountLabel}>Earned So Far</Text>
            <Text style={styles.earningsAmount}>
              {formatCurrency(salary.currentMonthEarned, salary.currency)}
            </Text>
          </View>

          <View style={styles.earningsDivider} />

          <View style={styles.earningsStats}>
            <View style={styles.earningsStat}>
              <Icon name="calendar-check" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.earningsStatValue}>{salary.daysWorked}</Text>
              <Text style={styles.earningsStatLabel}>Days Worked</Text>
            </View>
            <View style={styles.earningsStatDivider} />
            <View style={styles.earningsStat}>
              <Icon name="clock-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.earningsStatValue}>{salary.overtimeHours.toFixed(1)}h</Text>
              <Text style={styles.earningsStatLabel}>Overtime</Text>
            </View>
            <View style={styles.earningsStatDivider} />
            <View style={styles.earningsStat}>
              <Icon name="cash" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.earningsStatValue}>
                {formatCurrency(dailyRate, salary.currency)}
              </Text>
              <Text style={styles.earningsStatLabel}>Per Day</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Progress Card */}
        <View style={[styles.progressCard, {backgroundColor: colors.card}]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, {color: colors.text}]}>Monthly Progress</Text>
            <Text style={[styles.progressPercent, {color: colors.primary}]}>
              {progressPercent.toFixed(0)}%
            </Text>
          </View>
          <View style={[styles.progressBar, {backgroundColor: colors.border}]}>
            <View
              style={[
                styles.progressFill,
                {width: `${progressPercent}%`, backgroundColor: '#10B981'},
              ]}
            />
          </View>
          <View style={styles.progressFooter}>
            <Text style={[styles.progressText, {color: colors.textSecondary}]}>
              {salary.daysWorked} of {salary.workingDays} working days completed
            </Text>
          </View>
        </View>

        {/* Salary Breakdown */}
        <View style={[styles.breakdownCard, {backgroundColor: colors.card}]}>
          <View style={styles.breakdownHeader}>
            <View style={[styles.breakdownIcon, {backgroundColor: '#EEF2FF'}]}>
              <Icon name="file-document-outline" size={20} color="#6366F1" />
            </View>
            <Text style={[styles.breakdownTitle, {color: colors.text}]}>Salary Breakdown</Text>
          </View>

          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownLabel, {color: colors.textSecondary}]}>Base Salary</Text>
            <Text style={[styles.breakdownValue, {color: colors.text}]}>
              {formatCurrency(salary.baseSalary, salary.currency)}
            </Text>
          </View>

          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownLabel, {color: colors.textSecondary}]}>Gross Salary</Text>
            <Text style={[styles.breakdownValue, {color: colors.text}]}>
              {formatCurrency(salary.grossSalary, salary.currency)}
            </Text>
          </View>

          <View style={[styles.breakdownDivider, {backgroundColor: colors.border}]} />

          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownLabel, {color: colors.text, fontWeight: '700'}]}>
              Net Salary
            </Text>
            <Text style={[styles.breakdownValue, {color: '#10B981', fontWeight: '700'}]}>
              {formatCurrency(salary.netSalary, salary.currency)}
            </Text>
          </View>
        </View>

        {/* Attendance Summary */}
        <View style={[styles.attendanceCard, {backgroundColor: colors.card}]}>
          <View style={styles.attendanceHeader}>
            <View style={[styles.attendanceIcon, {backgroundColor: '#FEF3C7'}]}>
              <Icon name="calendar-clock" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.attendanceTitle, {color: colors.text}]}>
              Attendance Summary
            </Text>
          </View>

          <View style={styles.attendanceGrid}>
            <View style={[styles.attendanceItem, {backgroundColor: '#D1FAE5'}]}>
              <Text style={[styles.attendanceValue, {color: '#10B981'}]}>
                {salary.presentDays}
              </Text>
              <Text style={[styles.attendanceLabel, {color: '#059669'}]}>Present</Text>
            </View>
            <View style={[styles.attendanceItem, {backgroundColor: '#DBEAFE'}]}>
              <Text style={[styles.attendanceValue, {color: '#3B82F6'}]}>
                {salary.leaveDays}
              </Text>
              <Text style={[styles.attendanceLabel, {color: '#2563EB'}]}>Leaves</Text>
            </View>
            <View style={[styles.attendanceItem, {backgroundColor: '#FEE2E2'}]}>
              <Text style={[styles.attendanceValue, {color: '#EF4444'}]}>
                {salary.lopDays}
              </Text>
              <Text style={[styles.attendanceLabel, {color: '#DC2626'}]}>LOP</Text>
            </View>
            <View style={[styles.attendanceItem, {backgroundColor: '#FEF3C7'}]}>
              <Text style={[styles.attendanceValue, {color: '#F59E0B'}]}>
                {salary.overtimeHours.toFixed(1)}h
              </Text>
              <Text style={[styles.attendanceLabel, {color: '#D97706'}]}>Overtime</Text>
            </View>
          </View>
        </View>

        {/* Overtime Card */}
        {salary.overtimePay > 0 && (
          <View style={[styles.otCard, {backgroundColor: colors.card}]}>
            <View style={styles.otHeader}>
              <View style={[styles.otIcon, {backgroundColor: '#FEF3C7'}]}>
                <Icon name="clock-plus-outline" size={20} color="#F59E0B" />
              </View>
              <View style={styles.otInfo}>
                <Text style={[styles.otTitle, {color: colors.text}]}>Overtime Earnings</Text>
                <Text style={[styles.otHours, {color: colors.textSecondary}]}>
                  {salary.overtimeHours.toFixed(1)} hours
                </Text>
              </View>
              <Text style={[styles.otAmount, {color: '#F59E0B'}]}>
                +{formatCurrency(salary.overtimePay, salary.currency)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    fontSize: FontSizes.md,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  employeeCode: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  employeeDept: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  earningsCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  earningsIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  earningsHeaderText: {
    flex: 1,
  },
  earningsTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  earningsSubtitle: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  earningsMainAmount: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  earningsAmountLabel: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  earningsDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: Spacing.sm,
  },
  earningsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  earningsStat: {
    alignItems: 'center',
    flex: 1,
  },
  earningsStatValue: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  earningsStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  earningsStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressFooter: {
    marginTop: Spacing.xs,
  },
  progressText: {
    fontSize: FontSizes.sm,
  },
  breakdownCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  breakdownIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  breakdownTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  breakdownLabel: {
    fontSize: FontSizes.md,
  },
  breakdownValue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  breakdownDivider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  attendanceCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  attendanceIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  attendanceTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  attendanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  attendanceItem: {
    width: '48%',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    margin: '1%',
  },
  attendanceValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  attendanceLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  otCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  otHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  otIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  otInfo: {
    flex: 1,
  },
  otTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  otHours: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  otAmount: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  bottomPadding: {
    height: Spacing.xl * 2,
  },
});
