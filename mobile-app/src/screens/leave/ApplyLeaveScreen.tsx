import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAuthStore, useEmployee, useUser} from '../../store/authStore';
import {leaveApi} from '../../api/leaveApi';
import {handleApiError} from '../../api/apiClient';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import {showToast, showDialog} from '../../utils/alert';

// Simple Calendar Component
interface CalendarProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  minDate?: Date;
  colors: any;
}

function SimpleCalendar({selectedDate, onSelect, minDate, colors}: CalendarProps) {
  const [viewDate, setViewDate] = useState(selectedDate);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const isDisabled = (day: number) => {
    if (!minDate) return false;
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const min = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    return date < min;
  };

  const isSelected = (day: number) => {
    return selectedDate.getDate() === day &&
           selectedDate.getMonth() === viewDate.getMonth() &&
           selectedDate.getFullYear() === viewDate.getFullYear();
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day &&
           today.getMonth() === viewDate.getMonth() &&
           today.getFullYear() === viewDate.getFullYear();
  };

  const renderDays = () => {
    const days = [];
    const daysInMonth = getDaysInMonth(viewDate);
    const firstDay = getFirstDayOfMonth(viewDate);

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const disabled = isDisabled(day);
      const selected = isSelected(day);
      const today = isToday(day);

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            selected && {backgroundColor: colors.primary},
            today && !selected && {borderWidth: 1, borderColor: colors.primary},
          ]}
          onPress={() => {
            if (!disabled) {
              onSelect(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
            }
          }}
          disabled={disabled}>
          <Text
            style={[
              styles.calendarDayText,
              {color: disabled ? colors.textDisabled : colors.text},
              selected && {color: '#FFFFFF'},
            ]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return days;
  };

  return (
    <View style={[styles.calendar, {backgroundColor: colors.card}]}>
      {/* Header */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={prevMonth} style={styles.calendarNav}>
          <Icon name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.calendarTitle, {color: colors.text}]}>
          {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={styles.calendarNav}>
          <Icon name="chevron-right" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Day names */}
      <View style={styles.calendarWeek}>
        {dayNames.map(name => (
          <View key={name} style={styles.calendarDay}>
            <Text style={[styles.calendarDayName, {color: colors.textSecondary}]}>{name}</Text>
          </View>
        ))}
      </View>

      {/* Days grid */}
      <View style={styles.calendarGrid}>{renderDays()}</View>
    </View>
  );
}

export default function ApplyLeaveScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const employee = useEmployee();
  const user = useUser();
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  // Use employee._id if available, otherwise fallback to user's employeeId or user._id
  const effectiveEmployeeId = employee?._id || user?.employeeId || user?._id;

  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [reason, setReason] = useState('');

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startDateSelected, setStartDateSelected] = useState(false);
  const [endDateSelected, setEndDateSelected] = useState(false);

  const {data: leaveTypes} = useQuery({
    queryKey: ['leaveTypes'],
    queryFn: () => leaveApi.getLeaveTypes(),
  });

  const mutation = useMutation({
    mutationFn: (data: {leaveTypeId: string; startDate: string; endDate: string; reason: string; employeeId?: string}) =>
      leaveApi.createLeaveRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['leaveRequests']});
      queryClient.invalidateQueries({queryKey: ['leaveBalance']});
      showDialog.success('Success', 'Leave request submitted successfully', () => navigation.goBack());
    },
    onError: (error) => {
      showToast.error('Error', handleApiError(error));
    },
  });

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleStartDateSelect = (date: Date) => {
    setStartDate(date);
    setStartDateSelected(true);
    setShowStartPicker(false);
    if (date > endDate) {
      setEndDate(date);
      setEndDateSelected(true);
    }
  };

  const handleEndDateSelect = (date: Date) => {
    setEndDate(date);
    setEndDateSelected(true);
    setShowEndPicker(false);
  };

  const calculateDays = (): number => {
    if (!startDateSelected || !endDateSelected) return 0;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleSubmit = () => {
    if (!selectedLeaveType) {
      showToast.warning('Validation', 'Please select a leave type');
      return;
    }
    if (!startDateSelected || !endDateSelected) {
      showToast.warning('Validation', 'Please select start and end dates');
      return;
    }
    if (!reason.trim()) {
      showToast.warning('Validation', 'Please enter a reason for leave');
      return;
    }
    if (endDate < startDate) {
      showToast.warning('Validation', 'End date cannot be before start date');
      return;
    }

    mutation.mutate({
      leaveTypeId: selectedLeaveType,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      reason: reason.trim(),
      employeeId: effectiveEmployeeId,
    });
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Apply Leave</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Leave Type */}
        <View style={styles.field}>
          <Text style={[styles.label, {color: colors.text}]}>Leave Type *</Text>
          <View style={styles.typeGrid}>
            {(leaveTypes?.data?.leaveTypes || leaveTypes?.data || []).map((type: any) => (
              <TouchableOpacity
                key={type._id}
                style={[
                  styles.typeOption,
                  {borderColor: colors.border, backgroundColor: colors.card},
                  selectedLeaveType === type._id && {
                    borderColor: colors.primary,
                    backgroundColor: colors.primary + '15',
                  },
                ]}
                onPress={() => setSelectedLeaveType(type._id)}>
                <Icon
                  name="calendar-check-outline"
                  size={18}
                  color={selectedLeaveType === type._id ? colors.primary : colors.textSecondary}
                  style={styles.typeIcon}
                />
                <Text
                  style={[
                    styles.typeName,
                    {color: selectedLeaveType === type._id ? colors.primary : colors.text},
                  ]}>
                  {type.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date Fields */}
        <View style={styles.dateRow}>
          <View style={[styles.field, styles.dateField]}>
            <Text style={[styles.label, {color: colors.text}]}>Start Date *</Text>
            <TouchableOpacity
              style={[styles.dateInput, {backgroundColor: colors.card, borderColor: colors.border}]}
              onPress={() => setShowStartPicker(true)}>
              <Icon name="calendar" size={20} color={colors.primary} />
              <Text style={[styles.dateText, {color: startDateSelected ? colors.text : colors.textSecondary}]}>
                {startDateSelected ? formatDisplayDate(startDate) : 'Select date'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.field, styles.dateField]}>
            <Text style={[styles.label, {color: colors.text}]}>End Date *</Text>
            <TouchableOpacity
              style={[styles.dateInput, {backgroundColor: colors.card, borderColor: colors.border}]}
              onPress={() => setShowEndPicker(true)}>
              <Icon name="calendar" size={20} color={colors.primary} />
              <Text style={[styles.dateText, {color: endDateSelected ? colors.text : colors.textSecondary}]}>
                {endDateSelected ? formatDisplayDate(endDate) : 'Select date'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Days Summary */}
        {startDateSelected && endDateSelected && (
          <View style={[styles.daysSummary, {backgroundColor: colors.primary + '15'}]}>
            <Icon name="clock-outline" size={20} color={colors.primary} />
            <Text style={[styles.daysSummaryText, {color: colors.primary}]}>
              Total: {calculateDays()} {calculateDays() === 1 ? 'day' : 'days'}
            </Text>
          </View>
        )}

        {/* Reason */}
        <View style={styles.field}>
          <Text style={[styles.label, {color: colors.text}]}>Reason *</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {backgroundColor: colors.card, borderColor: colors.border, color: colors.text},
            ]}
            placeholder="Enter reason for leave..."
            placeholderTextColor={colors.textSecondary}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            {backgroundColor: colors.primary},
            mutation.isPending && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={mutation.isPending}>
          {mutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Icon name="send" size={20} color="#FFFFFF" style={{marginRight: 8}} />
              <Text style={styles.submitButtonText}>Submit Request</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{height: 40}} />
      </ScrollView>

      {/* Start Date Picker Modal */}
      <Modal visible={showStartPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {backgroundColor: colors.background}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: colors.text}]}>Select Start Date</Text>
              <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <SimpleCalendar
              selectedDate={startDate}
              onSelect={handleStartDateSelect}
              minDate={new Date()}
              colors={colors}
            />
          </View>
        </View>
      </Modal>

      {/* End Date Picker Modal */}
      <Modal visible={showEndPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {backgroundColor: colors.background}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: colors.text}]}>Select End Date</Text>
              <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <SimpleCalendar
              selectedDate={endDate}
              onSelect={handleEndDateSelect}
              minDate={startDate}
              colors={colors}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  headerSpacer: {width: 24},
  content: {flex: 1, padding: Spacing.lg},
  field: {marginBottom: Spacing.lg},
  label: {fontSize: FontSizes.md, fontWeight: '600', marginBottom: Spacing.sm},
  typeGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm},
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  typeIcon: {marginRight: Spacing.xs},
  typeName: {fontSize: FontSizes.sm, fontWeight: '500'},
  dateRow: {flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md},
  dateField: {flex: 1},
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  dateText: {fontSize: FontSizes.sm, flex: 1},
  daysSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  daysSummaryText: {fontSize: FontSizes.md, fontWeight: '600'},
  input: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
  },
  textArea: {height: 120},
  submitButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  submitButtonDisabled: {opacity: 0.7},
  submitButtonText: {color: '#FFFFFF', fontSize: FontSizes.lg, fontWeight: '600'},
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {fontSize: FontSizes.lg, fontWeight: '600'},
  // Calendar styles
  calendar: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  calendarNav: {
    padding: Spacing.xs,
  },
  calendarTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  calendarWeek: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  calendarDayName: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  calendarDayText: {
    fontSize: FontSizes.md,
  },
});
