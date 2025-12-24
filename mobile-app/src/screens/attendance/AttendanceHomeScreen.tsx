import React, {useState} from 'react';
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
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import type {RootStackParamList, Attendance} from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const summaryColors = [
  {icon: 'check-circle', color: '#10B981', bg: '#D1FAE5'},
  {icon: 'close-circle', color: '#EF4444', bg: '#FEE2E2'},
  {icon: 'clock-alert', color: '#F59E0B', bg: '#FEF3C7'},
  {icon: 'calendar-check', color: '#3B82F6', bg: '#DBEAFE'},
];

export default function AttendanceHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const employee = useEmployee();
  const user = useUser();
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  // Use employee._id if available, otherwise fallback to user._id
  const effectiveId = employee?._id || user?.employeeId || user?._id;

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Fetch today's attendance
  const {data: todayAttendance, isLoading: isLoadingToday, refetch: refetchToday} = useQuery({
    queryKey: ['todayAttendance', effectiveId],
    queryFn: () => attendanceApi.getTodayStatus(effectiveId || ''),
    enabled: !!effectiveId,
  });

  // Fetch attendance summary
  const {data: summary, isLoading: isLoadingSummary, refetch: refetchSummary} = useQuery({
    queryKey: ['attendanceSummary', effectiveId, selectedMonth, selectedYear],
    queryFn: () => attendanceApi.getAttendanceSummary(selectedMonth, selectedYear, effectiveId),
    enabled: !!effectiveId,
  });

  // Fetch attendance history
  const {data: history, isLoading: isLoadingHistory, refetch: refetchHistory} = useQuery({
    queryKey: ['attendanceHistory', effectiveId],
    queryFn: () =>
      attendanceApi.getAttendance({
        employeeId: effectiveId,
        limit: 30,
      }),
    enabled: !!effectiveId,
  });

  const isLoading = isLoadingToday || isLoadingSummary || isLoadingHistory;

  const handleRefresh = () => {
    refetchToday();
    refetchSummary();
    refetchHistory();
  };

  // Backend returns { success: true, data: { attendance, isCheckedIn, isCheckedOut } }
  // React Query wraps this in .data, so we need .data.data to access the nested data
  const attendance = todayAttendance?.data?.data?.attendance || todayAttendance?.data?.attendance || todayAttendance?.data;
  const hasCheckedIn = todayAttendance?.data?.data?.isCheckedIn || todayAttendance?.data?.isCheckedIn || !!attendance?.checkIn;
  const hasCheckedOut = todayAttendance?.data?.data?.isCheckedOut || todayAttendance?.data?.isCheckedOut || !!attendance?.checkOut;

  const getStatusColor = (status: Attendance['status']) => {
    switch (status) {
      case 'present':
        return '#10B981';
      case 'late':
        return '#F59E0B';
      case 'absent':
        return '#EF4444';
      case 'half_day':
        return '#F59E0B';
      case 'on_leave':
        return '#3B82F6';
      case 'holiday':
      case 'weekend':
        return '#8B5CF6';
      default:
        return colors.textSecondary;
    }
  };

  const getStatusBg = (status: Attendance['status']) => {
    switch (status) {
      case 'present':
        return '#D1FAE5';
      case 'late':
        return '#FEF3C7';
      case 'absent':
        return '#FEE2E2';
      case 'half_day':
        return '#FEF3C7';
      case 'on_leave':
        return '#DBEAFE';
      case 'holiday':
      case 'weekend':
        return '#EDE9FE';
      default:
        return colors.surfaceVariant;
    }
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}>

        {/* Header with Gradient */}
        <LinearGradient
          colors={['#F59E0B', '#F97316']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.headerGradient}>
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={styles.headerSubtitle}>
            {currentDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>

          {/* Today's Status */}
          <View style={styles.todayCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <View style={[styles.statusIconContainer, {backgroundColor: 'rgba(255,255,255,0.2)'}]}>
                  <Icon
                    name="login"
                    size={24}
                    color={hasCheckedIn ? '#4ADE80' : 'rgba(255,255,255,0.5)'}
                  />
                </View>
                <Text style={styles.statusLabel}>Check In</Text>
                <Text style={styles.statusTime}>
                  {attendance?.checkIn
                    ? new Date(attendance.checkIn).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '--:--'}
                </Text>
              </View>

              <View style={styles.statusDivider} />

              <View style={styles.statusItem}>
                <View style={[styles.statusIconContainer, {backgroundColor: 'rgba(255,255,255,0.2)'}]}>
                  <Icon
                    name="logout"
                    size={24}
                    color={hasCheckedOut ? '#FB7185' : 'rgba(255,255,255,0.5)'}
                  />
                </View>
                <Text style={styles.statusLabel}>Check Out</Text>
                <Text style={styles.statusTime}>
                  {attendance?.checkOut
                    ? new Date(attendance.checkOut).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '--:--'}
                </Text>
              </View>

              <View style={styles.statusDivider} />

              <View style={styles.statusItem}>
                <View style={[styles.statusIconContainer, {backgroundColor: 'rgba(255,255,255,0.2)'}]}>
                  <Icon name="timer-outline" size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.statusLabel}>Hours</Text>
                <Text style={styles.statusTime}>
                  {attendance?.workHours?.toFixed(1) || '0'}h
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Check In/Out Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              {backgroundColor: hasCheckedIn && !hasCheckedOut ? colors.error : colors.card},
              hasCheckedIn && hasCheckedOut && styles.buttonDisabled,
            ]}
            onPress={() => navigation.navigate(hasCheckedIn ? 'FaceCheckOut' : 'FaceCheckIn')}
            disabled={hasCheckedIn && hasCheckedOut}>
            <View style={[
              styles.actionIconContainer,
              {backgroundColor: hasCheckedIn && !hasCheckedOut ? 'rgba(255,255,255,0.2)' : '#F59E0B20'},
            ]}>
              <Icon
                name={hasCheckedIn && !hasCheckedOut ? 'logout' : 'camera-iris'}
                size={24}
                color={hasCheckedIn && !hasCheckedOut ? '#FFFFFF' : '#F59E0B'}
              />
            </View>
            <View style={styles.actionContent}>
              <Text style={[
                styles.actionText,
                {color: hasCheckedIn && !hasCheckedOut ? '#FFFFFF' : colors.text},
              ]}>
                {hasCheckedIn && hasCheckedOut
                  ? 'Attendance Complete'
                  : hasCheckedIn
                  ? 'Check Out Now'
                  : 'Check In with Face'}
              </Text>
              <Text style={[
                styles.actionSubtext,
                {color: hasCheckedIn && !hasCheckedOut ? 'rgba(255,255,255,0.7)' : colors.textSecondary},
              ]}>
                {hasCheckedIn && hasCheckedOut
                  ? 'Great job today!'
                  : hasCheckedIn
                  ? 'Tap to record checkout'
                  : 'Face recognition attendance'}
              </Text>
            </View>
            <Icon
              name="chevron-right"
              size={24}
              color={hasCheckedIn && !hasCheckedOut ? '#FFFFFF' : colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Face Enrollment Button */}
          {!employee?.faceEnrolled && (
            <TouchableOpacity
              style={[styles.actionButton, {backgroundColor: colors.card, marginTop: Spacing.md}]}
              onPress={() => navigation.navigate('FaceEnrollment')}>
              <View style={[styles.actionIconContainer, {backgroundColor: '#8B5CF620'}]}>
                <Icon name="face-man-outline" size={24} color="#8B5CF6" />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionText, {color: colors.text}]}>
                  Enroll Your Face
                </Text>
                <Text style={[styles.actionSubtext, {color: colors.textSecondary}]}>
                  Required for face check-in
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Monthly Summary */}
        <View style={[styles.card, {backgroundColor: colors.card}]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.cardIconContainer, {backgroundColor: '#FEF3C7'}]}>
                <Icon name="chart-bar" size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.cardTitle, {color: colors.text}]}>Monthly Summary</Text>
            </View>
            <Text style={[styles.monthLabel, {color: colors.textSecondary}]}>
              {new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>

          <View style={styles.summaryGrid}>
            <View style={[styles.summaryItem, {backgroundColor: summaryColors[0].bg}]}>
              <Icon name={summaryColors[0].icon} size={24} color={summaryColors[0].color} />
              <Text style={[styles.summaryValue, {color: summaryColors[0].color}]}>
                {summary?.data?.presentDays || 0}
              </Text>
              <Text style={[styles.summaryLabel, {color: summaryColors[0].color}]}>Present</Text>
            </View>
            <View style={[styles.summaryItem, {backgroundColor: summaryColors[1].bg}]}>
              <Icon name={summaryColors[1].icon} size={24} color={summaryColors[1].color} />
              <Text style={[styles.summaryValue, {color: summaryColors[1].color}]}>
                {summary?.data?.absentDays || 0}
              </Text>
              <Text style={[styles.summaryLabel, {color: summaryColors[1].color}]}>Absent</Text>
            </View>
            <View style={[styles.summaryItem, {backgroundColor: summaryColors[2].bg}]}>
              <Icon name={summaryColors[2].icon} size={24} color={summaryColors[2].color} />
              <Text style={[styles.summaryValue, {color: summaryColors[2].color}]}>
                {summary?.data?.lateDays || 0}
              </Text>
              <Text style={[styles.summaryLabel, {color: summaryColors[2].color}]}>Late</Text>
            </View>
            <View style={[styles.summaryItem, {backgroundColor: summaryColors[3].bg}]}>
              <Icon name={summaryColors[3].icon} size={24} color={summaryColors[3].color} />
              <Text style={[styles.summaryValue, {color: summaryColors[3].color}]}>
                {summary?.data?.leaveDays || 0}
              </Text>
              <Text style={[styles.summaryLabel, {color: summaryColors[3].color}]}>Leave</Text>
            </View>
          </View>

          <View style={styles.hoursContainer}>
            <View style={[styles.hoursItem, {backgroundColor: colors.surfaceVariant}]}>
              <Icon name="clock-outline" size={20} color={colors.primary} />
              <Text style={[styles.hoursValue, {color: colors.text}]}>
                {summary?.data?.totalWorkHours?.toFixed(0) || 0}h
              </Text>
              <Text style={[styles.hoursLabel, {color: colors.textSecondary}]}>Work Hours</Text>
            </View>
            <View style={[styles.hoursItem, {backgroundColor: colors.surfaceVariant}]}>
              <Icon name="clock-plus-outline" size={20} color="#8B5CF6" />
              <Text style={[styles.hoursValue, {color: colors.text}]}>
                {summary?.data?.totalOvertimeHours?.toFixed(0) || 0}h
              </Text>
              <Text style={[styles.hoursLabel, {color: colors.textSecondary}]}>Overtime</Text>
            </View>
          </View>
        </View>

        {/* Recent History */}
        <View style={[styles.card, {backgroundColor: colors.card}]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <View style={[styles.cardIconContainer, {backgroundColor: '#EDE9FE'}]}>
                <Icon name="history" size={20} color="#8B5CF6" />
              </View>
              <Text style={[styles.cardTitle, {color: colors.text}]}>Recent History</Text>
            </View>
          </View>

          {(history?.data?.data?.records || history?.data?.records || []).slice(0, 7).map((record: any, index: number) => (
            <View
              key={record._id || index}
              style={[styles.historyItem, index < 6 && {borderBottomColor: colors.border, borderBottomWidth: 1}]}>
              <View style={[styles.historyDate, {backgroundColor: getStatusBg(record.status)}]}>
                <Text style={[styles.historyDay, {color: getStatusColor(record.status)}]}>
                  {new Date(record.date).getDate()}
                </Text>
                <Text style={[styles.historyMonth, {color: getStatusColor(record.status)}]}>
                  {new Date(record.date).toLocaleDateString('en-US', {month: 'short'})}
                </Text>
              </View>
              <View style={styles.historyDetails}>
                <View style={[styles.historyBadge, {backgroundColor: getStatusBg(record.status)}]}>
                  <Text style={[styles.historyBadgeText, {color: getStatusColor(record.status)}]}>
                    {record.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.historyTimes, {color: colors.textSecondary}]}>
                  {record.checkIn
                    ? new Date(record.checkIn).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '--:--'}{' '}
                  -{' '}
                  {record.checkOut
                    ? new Date(record.checkOut).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '--:--'}
                </Text>
              </View>
              <View style={[styles.historyHoursContainer, {backgroundColor: colors.surfaceVariant}]}>
                <Text style={[styles.historyHours, {color: colors.text}]}>
                  {record.workHours?.toFixed(1) || 0}h
                </Text>
              </View>
            </View>
          ))}
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
  scrollView: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl + 24,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
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
    marginBottom: Spacing.lg,
  },
  todayCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statusLabel: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  statusTime: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusDivider: {
    width: 1,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionContainer: {
    paddingHorizontal: Spacing.lg,
    marginTop: -20,
    marginBottom: Spacing.lg,
  },
  actionButton: {
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
  buttonDisabled: {
    opacity: 0.6,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  actionSubtext: {
    fontSize: FontSizes.sm,
    marginTop: 2,
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
  monthLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginHorizontal: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  summaryLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
  },
  hoursContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  hoursItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  hoursValue: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  hoursLabel: {
    fontSize: FontSizes.xs,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  historyDate: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  historyDay: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  historyMonth: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  historyDetails: {
    flex: 1,
  },
  historyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginBottom: 4,
  },
  historyBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  historyTimes: {
    fontSize: FontSizes.sm,
  },
  historyHoursContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  historyHours: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  bottomPadding: {
    height: Spacing.xl,
  },
});
