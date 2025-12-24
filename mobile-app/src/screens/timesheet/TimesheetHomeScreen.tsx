import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAuthStore, useTenant} from '../../store/authStore';
import {timesheetApi} from '../../api/timesheetApi';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';

export default function TimesheetHomeScreen() {
  const navigation = useNavigation();
  const tenant = useTenant();
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const {data: timesheet, isLoading, isError, refetch} = useQuery({
    queryKey: ['currentTimesheet', tenant?._id],
    queryFn: async () => {
      try {
        return await timesheetApi.getCurrentTimesheet(tenant?._id || '');
      } catch (error) {
        console.log('[Timesheet] Error fetching timesheet:', error);
        return null;
      }
    },
    enabled: !!tenant?._id,
    retry: false,
  });

  const currentTimesheet = timesheet?.data?.timesheet || timesheet?.data;
  const entries = currentTimesheet?.entries || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return colors.success;
      case 'rejected': return colors.error;
      case 'submitted': return colors.info;
      default: return colors.warning;
    }
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Timesheet</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>

        {isError || !currentTimesheet ? (
          <View style={styles.emptyState}>
            <Icon name="clock-alert-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
              {isError ? 'Unable to load timesheet' : 'No timesheet available'}
            </Text>
            <Text style={[styles.emptySubtext, {color: colors.textDisabled}]}>
              Pull down to refresh
            </Text>
          </View>
        ) : (
          <>
            {/* Week Summary */}
            <View style={[styles.card, {backgroundColor: colors.card, borderColor: colors.cardBorder}]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, {color: colors.text}]}>Current Week</Text>
                <View style={[styles.statusBadge, {backgroundColor: getStatusColor(currentTimesheet.status) + '20'}]}>
                  <Text style={[styles.statusText, {color: getStatusColor(currentTimesheet.status)}]}>
                    {currentTimesheet.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={[styles.dateRange, {color: colors.textSecondary}]}>
                {new Date(currentTimesheet.weekStartDate).toLocaleDateString()} - {new Date(currentTimesheet.weekEndDate).toLocaleDateString()}
              </Text>

              <View style={styles.hoursGrid}>
                <View style={styles.hoursItem}>
                  <Text style={[styles.hoursValue, {color: colors.text}]}>{currentTimesheet.totalHours.toFixed(1)}</Text>
                  <Text style={[styles.hoursLabel, {color: colors.textSecondary}]}>Total Hours</Text>
                </View>
                <View style={styles.hoursItem}>
                  <Text style={[styles.hoursValue, {color: colors.success}]}>{currentTimesheet.billableHours.toFixed(1)}</Text>
                  <Text style={[styles.hoursLabel, {color: colors.textSecondary}]}>Billable</Text>
                </View>
                <View style={styles.hoursItem}>
                  <Text style={[styles.hoursValue, {color: colors.warning}]}>{currentTimesheet.overtimeHours.toFixed(1)}</Text>
                  <Text style={[styles.hoursLabel, {color: colors.textSecondary}]}>Overtime</Text>
                </View>
              </View>
            </View>

            {/* Entries */}
            <Text style={[styles.sectionTitle, {color: colors.text}]}>Time Entries</Text>
            {entries.map((entry, index) => (
              <View key={entry._id || index} style={[styles.entryCard, {backgroundColor: colors.card, borderColor: colors.cardBorder}]}>
                <View style={styles.entryHeader}>
                  <Text style={[styles.entryDate, {color: colors.text}]}>
                    {new Date(entry.date).toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'})}
                  </Text>
                  <Text style={[styles.entryHours, {color: colors.primary}]}>{entry.hours}h</Text>
                </View>
                <Text style={[styles.entryProject, {color: colors.textSecondary}]}>
                  {entry.project?.name || entry.taskName || 'No project'}
                </Text>
                {entry.description && (
                  <Text style={[styles.entryDescription, {color: colors.textSecondary}]} numberOfLines={1}>
                    {entry.description}
                  </Text>
                )}
              </View>
            ))}

            {entries.length === 0 && (
              <View style={styles.emptyState}>
                <Icon name="clock-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, {color: colors.textSecondary}]}>No entries this week</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md},
  headerTitle: {fontSize: FontSizes.lg, fontWeight: '600'},
  headerSpacer: {width: 24},
  content: {flex: 1, padding: Spacing.lg},
  card: {padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: Spacing.lg},
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  cardTitle: {fontSize: FontSizes.lg, fontWeight: '600'},
  statusBadge: {paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.xs},
  statusText: {fontSize: FontSizes.xs, fontWeight: '600'},
  dateRange: {fontSize: FontSizes.sm, marginTop: Spacing.xs, marginBottom: Spacing.md},
  hoursGrid: {flexDirection: 'row', justifyContent: 'space-around'},
  hoursItem: {alignItems: 'center'},
  hoursValue: {fontSize: FontSizes.xxl, fontWeight: '700'},
  hoursLabel: {fontSize: FontSizes.sm},
  sectionTitle: {fontSize: FontSizes.lg, fontWeight: '600', marginBottom: Spacing.md},
  entryCard: {padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.sm},
  entryHeader: {flexDirection: 'row', justifyContent: 'space-between'},
  entryDate: {fontSize: FontSizes.md, fontWeight: '600'},
  entryHours: {fontSize: FontSizes.md, fontWeight: '700'},
  entryProject: {fontSize: FontSizes.sm, marginTop: Spacing.xs},
  entryDescription: {fontSize: FontSizes.sm, marginTop: Spacing.xs},
  emptyState: {alignItems: 'center', paddingVertical: Spacing.xxl},
  emptyText: {fontSize: FontSizes.md, marginTop: Spacing.md},
  emptySubtext: {fontSize: FontSizes.sm, marginTop: Spacing.xs},
});
