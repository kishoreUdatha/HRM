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
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

import {useAuthStore} from '../../store/authStore';
import {adminApi, EmployeeSalaryDetails} from '../../api/adminApi';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import AppHeader, {HeaderGradients} from '../../components/AppHeader';
import type {RootStackParamList} from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

interface EmployeeSalaryItemProps {
  item: EmployeeSalaryDetails;
  onPress: () => void;
}

function EmployeeSalaryItem({item, onPress}: EmployeeSalaryItemProps) {
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const progressPercent = item.workingDays > 0
    ? Math.min(100, (item.daysWorked / item.workingDays) * 100)
    : 0;

  return (
    <TouchableOpacity
      style={[styles.salaryItem, {backgroundColor: colors.card}]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.employeeRow}>
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
        <View style={styles.salaryInfo}>
          <Text style={[styles.netSalaryLabel, {color: colors.textSecondary}]}>Net Salary</Text>
          <Text style={[styles.netSalary, {color: colors.text}]}>
            {formatCurrency(item.netSalary)}
          </Text>
        </View>
      </View>

      {/* Earned Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, {color: colors.textSecondary}]}>
            Earned this month
          </Text>
          <Text style={[styles.earnedAmount, {color: '#10B981'}]}>
            {formatCurrency(item.currentMonthEarned)}
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
            {item.daysWorked} of {item.workingDays} days worked
          </Text>
          {item.overtimeHours > 0 && (
            <Text style={[styles.otText, {color: '#F59E0B'}]}>
              +{item.overtimeHours.toFixed(1)}h OT
            </Text>
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, {color: colors.text}]}>{item.presentDays}</Text>
          <Text style={[styles.statLabel, {color: colors.textSecondary}]}>Present</Text>
        </View>
        <View style={[styles.statDivider, {backgroundColor: colors.border}]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, {color: colors.text}]}>{item.leaveDays}</Text>
          <Text style={[styles.statLabel, {color: colors.textSecondary}]}>Leaves</Text>
        </View>
        <View style={[styles.statDivider, {backgroundColor: colors.border}]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, {color: item.lopDays > 0 ? '#EF4444' : colors.text}]}>
            {item.lopDays}
          </Text>
          <Text style={[styles.statLabel, {color: colors.textSecondary}]}>LOP</Text>
        </View>
        <View style={[styles.statDivider, {backgroundColor: colors.border}]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, {color: '#10B981'}]}>
            {formatCurrency(item.overtimePay)}
          </Text>
          <Text style={[styles.statLabel, {color: colors.textSecondary}]}>OT Pay</Text>
        </View>
      </View>

      <Icon
        name="chevron-right"
        size={20}
        color={colors.textDisabled}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
}

export default function PayrollSummaryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Fetch payroll summary
  const {
    data: payrollData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['payrollSummary', selectedMonth, selectedYear],
    queryFn: () => adminApi.getPayrollSummary(selectedMonth, selectedYear),
    staleTime: 60000,
  });

  const summary = payrollData?.data;
  const employees = summary?.employees || [];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    const now = new Date();
    const isCurrentMonth = selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear();
    if (!isCurrentMonth) {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const renderHeader = () => (
    <View>
      {/* Month Selector */}
      <View style={[styles.monthSelector, {backgroundColor: colors.card}]}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.monthArrow}>
          <Icon name="chevron-left" size={28} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.monthInfo}>
          <Text style={[styles.monthText, {color: colors.text}]}>
            {monthNames[selectedMonth - 1]} {selectedYear}
          </Text>
        </View>
        <TouchableOpacity onPress={handleNextMonth} style={styles.monthArrow}>
          <Icon
            name="chevron-right"
            size={28}
            color={
              selectedMonth === currentDate.getMonth() + 1 &&
              selectedYear === currentDate.getFullYear()
                ? colors.textDisabled
                : colors.primary
            }
          />
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      <LinearGradient
        colors={['#10B981', '#059669']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryIconContainer}>
            <Icon name="currency-inr" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.summaryHeaderText}>
            <Text style={styles.summaryTitle}>Total Payroll</Text>
            <Text style={styles.summarySubtitle}>{summary?.totalEmployees || 0} employees</Text>
          </View>
        </View>

        <View style={styles.totalAmountRow}>
          <View style={styles.totalAmountItem}>
            <Text style={styles.totalAmountLabel}>Net to Pay</Text>
            <Text style={styles.totalAmountValue}>
              {formatCurrency(summary?.totalNetSalary || 0)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryStatsRow}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatValue}>
              {formatCurrency(summary?.totalGrossSalary || 0)}
            </Text>
            <Text style={styles.summaryStatLabel}>Gross</Text>
          </View>
          <View style={styles.summaryStatDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatValue}>
              {formatCurrency(summary?.totalDeductions || 0)}
            </Text>
            <Text style={styles.summaryStatLabel}>Deductions</Text>
          </View>
          <View style={styles.summaryStatDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatValue}>
              {formatCurrency(summary?.totalOvertimePay || 0)}
            </Text>
            <Text style={styles.summaryStatLabel}>OT Pay</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Today's Earnings Card */}
      <View style={[styles.todayCard, {backgroundColor: colors.card}]}>
        <View style={[styles.todayIcon, {backgroundColor: '#DBEAFE'}]}>
          <Icon name="calendar-today" size={20} color="#3B82F6" />
        </View>
        <View style={styles.todayInfo}>
          <Text style={[styles.todayLabel, {color: colors.textSecondary}]}>
            Total Earned Today
          </Text>
          <Text style={[styles.todayValue, {color: colors.text}]}>
            {formatCurrency(summary?.todayEarned || 0)}
          </Text>
        </View>
      </View>

      {/* Status Breakdown */}
      <View style={[styles.statusCard, {backgroundColor: colors.card}]}>
        <Text style={[styles.statusTitle, {color: colors.text}]}>Payroll Status</Text>
        <View style={styles.statusGrid}>
          <View style={[styles.statusItem, {backgroundColor: '#F1F5F9'}]}>
            <View style={[styles.statusDot, {backgroundColor: '#94A3B8'}]} />
            <Text style={[styles.statusLabel, {color: colors.textSecondary}]}>Draft</Text>
            <Text style={[styles.statusValue, {color: colors.text}]}>
              {summary?.statusBreakdown?.draft || 0}
            </Text>
          </View>
          <View style={[styles.statusItem, {backgroundColor: '#FEF3C7'}]}>
            <View style={[styles.statusDot, {backgroundColor: '#F59E0B'}]} />
            <Text style={[styles.statusLabel, {color: '#D97706'}]}>Processing</Text>
            <Text style={[styles.statusValue, {color: '#D97706'}]}>
              {summary?.statusBreakdown?.processing || 0}
            </Text>
          </View>
          <View style={[styles.statusItem, {backgroundColor: '#DBEAFE'}]}>
            <View style={[styles.statusDot, {backgroundColor: '#3B82F6'}]} />
            <Text style={[styles.statusLabel, {color: '#2563EB'}]}>Processed</Text>
            <Text style={[styles.statusValue, {color: '#2563EB'}]}>
              {summary?.statusBreakdown?.processed || 0}
            </Text>
          </View>
          <View style={[styles.statusItem, {backgroundColor: '#D1FAE5'}]}>
            <View style={[styles.statusDot, {backgroundColor: '#10B981'}]} />
            <Text style={[styles.statusLabel, {color: '#059669'}]}>Paid</Text>
            <Text style={[styles.statusValue, {color: '#059669'}]}>
              {summary?.statusBreakdown?.paid || 0}
            </Text>
          </View>
        </View>
      </View>

      {/* Employee List Header */}
      <View style={styles.listHeader}>
        <Text style={[styles.listTitle, {color: colors.text}]}>Employee Salaries</Text>
        <Text style={[styles.listCount, {color: colors.textSecondary}]}>
          {employees.length} employees
        </Text>
      </View>
    </View>
  );

  const renderItem = useCallback(
    ({item}: {item: EmployeeSalaryDetails}) => (
      <EmployeeSalaryItem
        item={item}
        onPress={() => navigation.navigate('EmployeeSalaryDetail' as any, {employeeId: item.employeeId})}
      />
    ),
    [navigation]
  );

  const keyExtractor = useCallback((item: EmployeeSalaryDetails) => item.employeeId, []);

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <AppHeader
        title="Payroll Summary"
        subtitle={`${monthNames[selectedMonth - 1]} ${selectedYear}`}
        gradientColors={HeaderGradients.payroll}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, {color: colors.textSecondary}]}>
            Loading payroll data...
          </Text>
        </View>
      ) : (
        <FlatList
          data={employees}
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
              <Icon name="cash-remove" size={64} color={colors.textDisabled} />
              <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
                No payroll data for this month
              </Text>
              <Text style={[styles.emptySubtext, {color: colors.textDisabled}]}>
                Generate payroll from the web dashboard
              </Text>
            </View>
          )}
        />
      )}
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
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  monthArrow: {
    padding: Spacing.xs,
  },
  monthInfo: {
    flex: 1,
    alignItems: 'center',
  },
  monthText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  summaryCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  summaryHeaderText: {},
  summaryTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summarySubtitle: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.8)',
  },
  totalAmountRow: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  totalAmountItem: {
    alignItems: 'center',
  },
  totalAmountLabel: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  totalAmountValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: Spacing.sm,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStat: {
    alignItems: 'center',
    flex: 1,
  },
  summaryStatValue: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  summaryStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  todayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  todayIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  todayInfo: {
    flex: 1,
  },
  todayLabel: {
    fontSize: FontSizes.sm,
  },
  todayValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  },
  statusCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statusTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    margin: '1%',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  statusLabel: {
    flex: 1,
    fontSize: FontSizes.sm,
  },
  statusValue: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  listTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  listCount: {
    fontSize: FontSizes.sm,
  },
  salaryItem: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  employeeRow: {
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
  salaryInfo: {
    alignItems: 'flex-end',
  },
  netSalaryLabel: {
    fontSize: FontSizes.xs,
  },
  netSalary: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  progressSection: {
    marginBottom: Spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: FontSizes.sm,
  },
  earnedAmount: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  progressText: {
    fontSize: FontSizes.xs,
  },
  otText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  chevron: {
    position: 'absolute',
    right: Spacing.md,
    top: '50%',
    marginTop: -10,
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
  emptySubtext: {
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs,
  },
});
