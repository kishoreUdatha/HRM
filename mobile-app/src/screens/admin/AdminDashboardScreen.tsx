import React, {useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

import {useAuthStore, useUser, useTenant} from '../../store/authStore';
import {adminApi} from '../../api/adminApi';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import AppHeader, {HeaderGradients} from '../../components/AppHeader';
import type {RootStackParamList} from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
const {width} = Dimensions.get('window');

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

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  bgColor: string;
  subtitle?: string;
  onPress?: () => void;
}

function StatCard({title, value, icon, color, bgColor, subtitle, onPress}: StatCardProps) {
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  return (
    <TouchableOpacity
      style={[styles.statCard, {backgroundColor: colors.card}]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}>
      <View style={[styles.statIconContainer, {backgroundColor: bgColor}]}>
        <Icon name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.statValue, {color: colors.text}]}>{value}</Text>
      <Text style={[styles.statTitle, {color: colors.textSecondary}]}>{title}</Text>
      {subtitle && <Text style={[styles.statSubtitle, {color: color}]}>{subtitle}</Text>}
    </TouchableOpacity>
  );
}

interface QuickActionProps {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
  onPress: () => void;
  badge?: number;
}

function QuickAction({icon, label, color, bgColor, onPress, badge}: QuickActionProps) {
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  return (
    <TouchableOpacity
      style={[styles.quickAction, {backgroundColor: colors.card}]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, {backgroundColor: bgColor}]}>
        <Icon name={icon} size={26} color={color} />
        {badge !== undefined && badge > 0 && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.quickActionLabel, {color: colors.text}]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AdminDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const user = useUser();
  const tenant = useTenant();
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  // Fetch dashboard stats
  const {
    data: dashboardData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: () => adminApi.getDashboardStats(),
    staleTime: 30000, // 30 seconds
    refetchOnMount: 'always',
  });

  // Fetch payroll summary
  const {data: payrollData, refetch: refetchPayroll} = useQuery({
    queryKey: ['adminPayroll'],
    queryFn: () => adminApi.getPayrollSummary(),
    staleTime: 60000, // 1 minute
  });

  // Refetch on focus
  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchPayroll();
    }, [refetch, refetchPayroll])
  );

  const handleRefresh = () => {
    refetch();
    refetchPayroll();
  };

  const stats = dashboardData?.data;
  const payroll = payrollData?.data;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const renderNotificationButton = () => (
    <TouchableOpacity
      onPress={() => navigation.navigate('Notifications')}
      style={styles.notificationButton}>
      <Icon name="bell-outline" size={24} color="#FFFFFF" />
      {(stats?.pendingLeaves || 0) > 0 && <View style={styles.notificationBadge} />}
    </TouchableOpacity>
  );

  const renderHeaderContent = () => (
    <View style={styles.headerStats}>
      <View style={styles.headerStatItem}>
        <Text style={styles.headerStatValue}>{stats?.todayPresent || 0}</Text>
        <Text style={styles.headerStatLabel}>Present Today</Text>
      </View>
      <View style={styles.headerDivider} />
      <View style={styles.headerStatItem}>
        <Text style={styles.headerStatValue}>{stats?.totalEmployees || 0}</Text>
        <Text style={styles.headerStatLabel}>Total Employees</Text>
      </View>
      <View style={styles.headerDivider} />
      <View style={styles.headerStatItem}>
        <Text style={styles.headerStatValue}>{stats?.pendingLeaves || 0}</Text>
        <Text style={styles.headerStatLabel}>Pending Leaves</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <AppHeader
        title={`${getGreeting()}, ${user?.firstName || 'Admin'}`}
        subtitle={tenant?.name || 'Company'}
        showBack={false}
        gradientColors={['#6366F1', '#4F46E5']}
        rightComponent={renderNotificationButton()}
        extraPadding={20}>
        {renderHeaderContent()}
      </AppHeader>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }>

        {/* Payroll Overview Card */}
        <View style={styles.payrollCard}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.payrollGradient}>
            <View style={styles.payrollHeader}>
              <View style={styles.payrollIconContainer}>
                <Icon name="currency-inr" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.payrollHeaderText}>
                <Text style={styles.payrollTitle}>Monthly Payroll</Text>
                <Text style={styles.payrollSubtitle}>
                  {new Date().toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('PayrollSummary' as any)}>
                <Text style={styles.viewAllText}>View All</Text>
                <Icon name="chevron-right" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.payrollAmount}>
              <Text style={styles.payrollAmountLabel}>Total to Pay</Text>
              <Text style={styles.payrollAmountValue}>
                {formatCurrency(payroll?.totalNetSalary || 0)}
              </Text>
            </View>

            <View style={styles.payrollDivider} />

            <View style={styles.payrollStats}>
              <View style={styles.payrollStat}>
                <Text style={styles.payrollStatValue}>{payroll?.totalEmployees || 0}</Text>
                <Text style={styles.payrollStatLabel}>Employees</Text>
              </View>
              <View style={styles.payrollStatDivider} />
              <View style={styles.payrollStat}>
                <Text style={styles.payrollStatValue}>
                  {formatCurrency(payroll?.todayEarned || 0)}
                </Text>
                <Text style={styles.payrollStatLabel}>Earned Today</Text>
              </View>
              <View style={styles.payrollStatDivider} />
              <View style={styles.payrollStat}>
                <Text style={styles.payrollStatValue}>
                  {formatCurrency(payroll?.totalOvertimePay || 0)}
                </Text>
                <Text style={styles.payrollStatLabel}>OT Pay</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction
              icon="account-group"
              label="Attendance"
              color="#F59E0B"
              bgColor="#FEF3C7"
              onPress={() => navigation.navigate('TeamAttendance' as any)}
            />
            <QuickAction
              icon="calendar-clock"
              label="Leaves"
              color="#EC4899"
              bgColor="#FCE7F3"
              onPress={() => navigation.navigate('TeamLeaves' as any)}
              badge={stats?.pendingLeaves}
            />
            <QuickAction
              icon="cash-multiple"
              label="Salaries"
              color="#10B981"
              bgColor="#D1FAE5"
              onPress={() => navigation.navigate('PayrollSummary' as any)}
            />
            <QuickAction
              icon="account-details"
              label="Employees"
              color="#6366F1"
              bgColor="#EEF2FF"
              onPress={() => navigation.navigate('EmployeeList' as any)}
            />
          </View>
        </View>

        {/* Today's Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>Today's Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Present"
              value={stats?.todayPresent || 0}
              icon="check-circle"
              color="#10B981"
              bgColor="#D1FAE5"
              onPress={() => navigation.navigate('TeamAttendance' as any)}
            />
            <StatCard
              title="Absent"
              value={stats?.todayAbsent || 0}
              icon="close-circle"
              color="#EF4444"
              bgColor="#FEE2E2"
              onPress={() => navigation.navigate('TeamAttendance' as any)}
            />
            <StatCard
              title="Late"
              value={stats?.todayLate || 0}
              icon="clock-alert"
              color="#F59E0B"
              bgColor="#FEF3C7"
              onPress={() => navigation.navigate('TeamAttendance' as any)}
            />
            <StatCard
              title="On Leave"
              value={stats?.todayOnLeave || 0}
              icon="calendar-remove"
              color="#8B5CF6"
              bgColor="#EDE9FE"
              onPress={() => navigation.navigate('TeamLeaves' as any)}
            />
          </View>
        </View>

        {/* Payroll Status Breakdown */}
        <View style={[styles.card, {backgroundColor: colors.card}]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.cardIconContainer, {backgroundColor: '#D1FAE5'}]}>
                <Icon name="chart-pie" size={20} color="#10B981" />
              </View>
              <Text style={[styles.cardTitle, {color: colors.text}]}>Payroll Status</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('PayrollSummary' as any)}>
              <Text style={[styles.cardLink, {color: colors.primary}]}>Details</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statusGrid}>
            <View style={[styles.statusItem, {backgroundColor: colors.background}]}>
              <View style={[styles.statusDot, {backgroundColor: '#94A3B8'}]} />
              <Text style={[styles.statusLabel, {color: colors.textSecondary}]}>Draft</Text>
              <Text style={[styles.statusValue, {color: colors.text}]}>
                {payroll?.statusBreakdown?.draft || 0}
              </Text>
            </View>
            <View style={[styles.statusItem, {backgroundColor: colors.background}]}>
              <View style={[styles.statusDot, {backgroundColor: '#F59E0B'}]} />
              <Text style={[styles.statusLabel, {color: colors.textSecondary}]}>Processing</Text>
              <Text style={[styles.statusValue, {color: colors.text}]}>
                {payroll?.statusBreakdown?.processing || 0}
              </Text>
            </View>
            <View style={[styles.statusItem, {backgroundColor: colors.background}]}>
              <View style={[styles.statusDot, {backgroundColor: '#3B82F6'}]} />
              <Text style={[styles.statusLabel, {color: colors.textSecondary}]}>Processed</Text>
              <Text style={[styles.statusValue, {color: colors.text}]}>
                {payroll?.statusBreakdown?.processed || 0}
              </Text>
            </View>
            <View style={[styles.statusItem, {backgroundColor: colors.background}]}>
              <View style={[styles.statusDot, {backgroundColor: '#10B981'}]} />
              <Text style={[styles.statusLabel, {color: colors.textSecondary}]}>Paid</Text>
              <Text style={[styles.statusValue, {color: colors.text}]}>
                {payroll?.statusBreakdown?.paid || 0}
              </Text>
            </View>
          </View>
        </View>

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
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F87171',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  headerStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerStatLabel: {
    fontSize: FontSizes.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: Spacing.md,
  },
  payrollCard: {
    marginHorizontal: Spacing.lg,
    marginTop: -10,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  payrollGradient: {
    padding: Spacing.md,
  },
  payrollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payrollIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  payrollHeaderText: {
    flex: 1,
  },
  payrollTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  payrollSubtitle: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  viewAllText: {
    fontSize: FontSizes.xs,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  payrollAmount: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  payrollAmountLabel: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  payrollAmountValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  payrollDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: Spacing.sm,
  },
  payrollStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  payrollStat: {
    alignItems: 'center',
    flex: 1,
  },
  payrollStatValue: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  payrollStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  payrollStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  quickAction: {
    width: (width - Spacing.lg * 2 - 24) / 4,
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  quickActionLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  statCard: {
    width: (width - Spacing.lg * 2 - 24) / 4,
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginHorizontal: 4,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statTitle: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  cardLink: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
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
  bottomPadding: {
    height: Spacing.xl * 2,
  },
});
