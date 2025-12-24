import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

import {useAuthStore, useEmployee, useUser} from '../../store/authStore';
import {attendanceApi} from '../../api/attendanceApi';
import {leaveApi} from '../../api/leaveApi';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import type {RootStackParamList} from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface QuickAction {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
  onPress: () => void;
}

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore(state => state.user);
  const employee = useEmployee();
  const currentUser = useUser();
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  // Use employee._id if available, otherwise fallback to user._id
  const effectiveId = employee?._id || currentUser?.employeeId || currentUser?._id;

  // Fetch today's attendance status
  const {
    data: todayAttendance,
    isLoading: isLoadingAttendance,
    refetch: refetchAttendance,
  } = useQuery({
    queryKey: ['todayAttendance', effectiveId],
    queryFn: () => attendanceApi.getTodayStatus(effectiveId || ''),
    enabled: !!effectiveId,
  });

  // Fetch leave balance
  const {
    data: leaveBalance,
    isLoading: isLoadingLeave,
    refetch: refetchLeave,
  } = useQuery({
    queryKey: ['leaveBalance', effectiveId],
    queryFn: () => leaveApi.getLeaveBalance(effectiveId || ''),
    enabled: !!effectiveId,
  });

  // Fetch upcoming holidays
  const {data: holidays} = useQuery({
    queryKey: ['holidays'],
    queryFn: () => leaveApi.getHolidays({year: new Date().getFullYear()}),
  });

  const isRefreshing = isLoadingAttendance || isLoadingLeave;

  const handleRefresh = () => {
    refetchAttendance();
    refetchLeave();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Backend returns { data: { attendance, isCheckedIn, isCheckedOut } }
  const attendance = todayAttendance?.data?.attendance || todayAttendance?.data;
  const hasCheckedIn = todayAttendance?.data?.isCheckedIn || !!attendance?.checkIn;
  const hasCheckedOut = todayAttendance?.data?.isCheckedOut || !!attendance?.checkOut;

  const quickActions: QuickAction[] = [
    {
      icon: 'calendar-plus-outline',
      label: 'Apply Leave',
      color: colors.actionLeave,
      bgColor: colors.actionLeaveBg,
      onPress: () => navigation.navigate('ApplyLeave'),
    },
    {
      icon: 'clock-outline',
      label: 'Timesheet',
      color: colors.actionTimesheet,
      bgColor: colors.actionTimesheetBg,
      onPress: () => navigation.navigate('TimesheetDetail'),
    },
    {
      icon: 'wallet-outline',
      label: 'Payslips',
      color: colors.actionPayslips,
      bgColor: colors.actionPayslipsBg,
      onPress: () => navigation.navigate('PayslipDetail' as any),
    },
    {
      icon: 'account-outline',
      label: 'Profile',
      color: colors.actionProfile,
      bgColor: colors.actionProfileBg,
      onPress: () => navigation.navigate('Profile'),
    },
  ];

  const leaveTypeColors = [
    {color: '#EC4899', bg: '#FCE7F3'},
    {color: '#3B82F6', bg: '#DBEAFE'},
    {color: '#10B981', bg: '#D1FAE5'},
    {color: '#F59E0B', bg: '#FEF3C7'},
  ];

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }>
        {/* Header with Gradient */}
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.headerGradient}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName}>{user?.firstName || 'User'}</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              style={styles.notificationButton}>
              <Icon name="bell-outline" size={24} color="#FFFFFF" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>

          {/* Attendance Card in Header */}
          <View style={styles.attendanceCardHeader}>
            <View style={styles.attendanceStatus}>
              <View style={styles.attendanceItem}>
                <View style={[styles.attendanceIcon, {backgroundColor: 'rgba(255,255,255,0.2)'}]}>
                  <Icon
                    name="login"
                    size={22}
                    color={hasCheckedIn ? '#4ADE80' : 'rgba(255,255,255,0.6)'}
                  />
                </View>
                <Text style={styles.attendanceLabelWhite}>Check In</Text>
                <Text style={styles.attendanceTimeWhite}>
                  {attendance?.checkIn
                    ? new Date(attendance.checkIn).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '--:--'}
                </Text>
              </View>

              <View style={styles.dividerWhite} />

              <View style={styles.attendanceItem}>
                <View style={[styles.attendanceIcon, {backgroundColor: 'rgba(255,255,255,0.2)'}]}>
                  <Icon
                    name="logout"
                    size={22}
                    color={hasCheckedOut ? '#FB7185' : 'rgba(255,255,255,0.6)'}
                  />
                </View>
                <Text style={styles.attendanceLabelWhite}>Check Out</Text>
                <Text style={styles.attendanceTimeWhite}>
                  {attendance?.checkOut
                    ? new Date(attendance.checkOut).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '--:--'}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Check In/Out Button */}
        <View style={styles.checkButtonContainer}>
          <TouchableOpacity
            style={[
              styles.checkButton,
              {
                backgroundColor: hasCheckedIn && !hasCheckedOut ? colors.error : colors.card,
              },
              hasCheckedIn && hasCheckedOut && styles.checkButtonDisabled,
            ]}
            onPress={() =>
              navigation.navigate(hasCheckedIn ? 'FaceCheckOut' : 'FaceCheckIn')
            }
            disabled={hasCheckedIn && hasCheckedOut}>
            <View style={[
              styles.checkButtonIcon,
              {backgroundColor: hasCheckedIn && !hasCheckedOut ? 'rgba(255,255,255,0.2)' : colors.primary + '20'},
            ]}>
              <Icon
                name={hasCheckedIn && !hasCheckedOut ? 'logout' : 'camera-iris'}
                size={24}
                color={hasCheckedIn && !hasCheckedOut ? '#FFFFFF' : colors.primary}
              />
            </View>
            <View style={styles.checkButtonContent}>
              <Text style={[
                styles.checkButtonText,
                {color: hasCheckedIn && !hasCheckedOut ? '#FFFFFF' : colors.text},
              ]}>
                {hasCheckedIn && hasCheckedOut
                  ? 'Completed for Today'
                  : hasCheckedIn
                  ? 'Check Out Now'
                  : 'Check In with Face ID'}
              </Text>
              <Text style={[
                styles.checkButtonSubtext,
                {color: hasCheckedIn && !hasCheckedOut ? 'rgba(255,255,255,0.7)' : colors.textSecondary},
              ]}>
                {hasCheckedIn && hasCheckedOut
                  ? 'See you tomorrow!'
                  : hasCheckedIn
                  ? 'Tap to record your checkout'
                  : 'Face recognition for attendance'}
              </Text>
            </View>
            <Icon
              name="chevron-right"
              size={24}
              color={hasCheckedIn && !hasCheckedOut ? '#FFFFFF' : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>Quick Actions</Text>
          <View style={styles.quickActions}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.quickAction, {backgroundColor: colors.card}]}
                onPress={action.onPress}
                activeOpacity={0.7}>
                <View style={[styles.quickActionIcon, {backgroundColor: action.bgColor}]}>
                  <Icon name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={[styles.quickActionLabel, {color: colors.text}]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Leave Balance */}
        <View style={[styles.card, {backgroundColor: colors.card}]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.cardIconContainer, {backgroundColor: colors.actionLeaveBg}]}>
                <Icon name="calendar-check" size={20} color={colors.actionLeave} />
              </View>
              <Text style={[styles.cardTitle, {color: colors.text}]}>Leave Balance</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('ApplyLeave')}>
              <Text style={[styles.cardLink, {color: colors.primary}]}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.leaveBalances}>
            {(leaveBalance?.data?.data?.balances || leaveBalance?.data?.balances || [])?.slice(0, 4).map((balance: any, index: number) => {
              const colorSet = leaveTypeColors[index % leaveTypeColors.length];
              return (
                <View key={index} style={[styles.leaveItem, {backgroundColor: colorSet.bg}]}>
                  <Text style={[styles.leaveDays, {color: colorSet.color}]}>
                    {balance.available ?? balance.availableDays ?? 0}
                  </Text>
                  <Text style={[styles.leaveType, {color: colorSet.color}]} numberOfLines={1}>
                    {balance.leaveType?.name || balance.leaveTypeId?.name || 'Leave'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Upcoming Holidays */}
        {(holidays?.data?.data?.holidays || holidays?.data?.holidays || holidays?.data || []).length > 0 && (
          <View style={[styles.card, {backgroundColor: colors.card}]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.cardIconContainer, {backgroundColor: colors.menuCalendarBg}]}>
                  <Icon name="calendar-month-outline" size={20} color={colors.menuCalendar} />
                </View>
                <Text style={[styles.cardTitle, {color: colors.text}]}>Upcoming Holidays</Text>
              </View>
            </View>

            {(holidays?.data?.data?.holidays || holidays?.data?.holidays || holidays?.data || []).slice(0, 3).map((holiday: any, index: number) => {
              const colorSet = leaveTypeColors[index % leaveTypeColors.length];
              return (
                <View key={index} style={styles.holidayItem}>
                  <View style={[styles.holidayDate, {backgroundColor: colorSet.bg}]}>
                    <Text style={[styles.holidayDay, {color: colorSet.color}]}>
                      {new Date(holiday.date).getDate()}
                    </Text>
                    <Text style={[styles.holidayMonth, {color: colorSet.color}]}>
                      {new Date(holiday.date).toLocaleDateString('en-US', {month: 'short'})}
                    </Text>
                  </View>
                  <View style={styles.holidayInfo}>
                    <Text style={[styles.holidayName, {color: colors.text}]}>{holiday.name}</Text>
                    <Text style={[styles.holidayType, {color: colors.textSecondary}]}>
                      {holiday.type}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={20} color={colors.textSecondary} />
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl + 30,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  headerLeft: {},
  greeting: {
    fontSize: FontSizes.md,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
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
  attendanceCardHeader: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.lg,
  },
  attendanceStatus: {
    flexDirection: 'row',
  },
  attendanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  attendanceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  attendanceLabelWhite: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  attendanceTimeWhite: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dividerWhite: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: Spacing.lg,
  },
  checkButtonContainer: {
    paddingHorizontal: Spacing.lg,
    marginTop: -24,
    marginBottom: Spacing.lg,
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  checkButtonDisabled: {
    opacity: 0.6,
  },
  checkButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  checkButtonContent: {
    flex: 1,
  },
  checkButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  checkButtonSubtext: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
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
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
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
    marginBottom: Spacing.lg,
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
  leaveBalances: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  leaveItem: {
    width: '48%',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    margin: '1%',
  },
  leaveDays: {
    fontSize: 28,
    fontWeight: '700',
  },
  leaveType: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  holidayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  holidayDate: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  holidayDay: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  holidayMonth: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  holidayInfo: {
    flex: 1,
  },
  holidayName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  holidayType: {
    fontSize: FontSizes.sm,
    textTransform: 'capitalize',
  },
  bottomPadding: {
    height: Spacing.xl,
  },
});
