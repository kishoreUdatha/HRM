import React, {useState, useMemo} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {Calendar} from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAuthStore} from '../../store/authStore';
import {leaveApi} from '../../api/leaveApi';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import AppHeader, {HeaderGradients} from '../../components/AppHeader';

export default function HolidayCalendarScreen() {
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const {data: holidays} = useQuery({
    queryKey: ['holidays', selectedYear],
    queryFn: () => leaveApi.getHolidays({year: selectedYear}),
  });

  // API returns {success: true, data: {holidays: [...]}}
  const holidayList = holidays?.data?.data?.holidays || holidays?.data?.holidays || holidays?.data || [];

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    holidayList?.forEach((holiday: any) => {
      const dateStr = new Date(holiday.date).toISOString().split('T')[0];
      marks[dateStr] = {
        marked: true,
        dotColor: colors.primary,
        customStyles: {container: {backgroundColor: colors.primaryLight + '20'}},
      };
    });
    return marks;
  }, [holidayList, colors]);

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <AppHeader
        title="Holiday Calendar"
        gradientColors={HeaderGradients.calendar}
      />

      <Calendar
        markedDates={markedDates}
        markingType="custom"
        theme={{
          calendarBackground: colors.background,
          textSectionTitleColor: colors.textSecondary,
          dayTextColor: colors.text,
          todayTextColor: colors.primary,
          monthTextColor: colors.text,
          arrowColor: colors.primary,
          textDisabledColor: colors.textDisabled,
        }}
        onMonthChange={(month: any) => {
          if (month.year !== selectedYear) setSelectedYear(month.year);
        }}
      />

      <ScrollView style={styles.holidayList}>
        <Text style={[styles.sectionTitle, {color: colors.text}]}>Upcoming Holidays</Text>
        {holidayList.length > 0 ? (
          holidayList.map((holiday: any, index: number) => (
            <View key={holiday._id || index} style={[styles.holidayItem, {backgroundColor: colors.card, borderColor: colors.cardBorder}]}>
              <View style={[styles.dateBadge, {backgroundColor: colors.primaryLight + '20'}]}>
                <Text style={[styles.dateDay, {color: colors.primary}]}>{new Date(holiday.date).getDate()}</Text>
                <Text style={[styles.dateMonth, {color: colors.primary}]}>
                  {new Date(holiday.date).toLocaleDateString('en-US', {month: 'short'})}
                </Text>
              </View>
              <View style={styles.holidayInfo}>
                <Text style={[styles.holidayName, {color: colors.text}]}>{holiday.name}</Text>
                <Text style={[styles.holidayType, {color: colors.textSecondary}]}>
                  {holiday.type} {holiday.isNational && '- National'}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Icon name="calendar-blank-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, {color: colors.textSecondary}]}>No holidays found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {fontSize: FontSizes.lg, fontWeight: '600'},
  holidayList: {flex: 1, padding: Spacing.lg},
  sectionTitle: {fontSize: FontSizes.lg, fontWeight: '600', marginBottom: Spacing.md},
  holidayItem: {flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.sm},
  dateBadge: {width: 48, height: 48, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md},
  dateDay: {fontSize: FontSizes.lg, fontWeight: '700'},
  dateMonth: {fontSize: FontSizes.xs},
  holidayInfo: {flex: 1},
  holidayName: {fontSize: FontSizes.md, fontWeight: '600'},
  holidayType: {fontSize: FontSizes.sm, textTransform: 'capitalize'},
  emptyState: {alignItems: 'center', paddingVertical: Spacing.xxl},
  emptyText: {fontSize: FontSizes.md, marginTop: Spacing.md},
});
