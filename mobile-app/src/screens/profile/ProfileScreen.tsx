import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useMutation} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAuthStore, useUser, useEmployee} from '../../store/authStore';
import apiClient from '../../api/apiClient';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const user = useUser();
  const employee = useEmployee();
  const {isDarkMode, setUser, setEmployee} = useAuthStore();
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const [isEditing, setIsEditing] = useState(false);
  const [editedPhone, setEditedPhone] = useState(employee?.phone || '');

  const updateProfileMutation = useMutation({
    mutationFn: async (data: {phone: string}) => {
      const response = await apiClient.patch('/employees/me/profile', data);
      return response.data;
    },
    onSuccess: (response) => {
      if (response.success && response.data?.employee) {
        setEmployee(response.data.employee);
        Alert.alert('Success', 'Profile updated successfully');
        setIsEditing(false);
      }
    },
    onError: () => {
      Alert.alert('Error', 'Failed to update profile');
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate({phone: editedPhone});
  };

  const handleCancel = () => {
    setEditedPhone(employee?.phone || '');
    setIsEditing(false);
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Profile</Text>
        {isEditing ? (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
              <Icon name="close" size={24} color={colors.error} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
              <Icon name="check" size={24} color={colors.success} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Icon name="pencil" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, {backgroundColor: colors.primary}]}>
            <Text style={styles.avatarText}>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</Text>
          </View>
          <Text style={[styles.name, {color: colors.text}]}>{user?.firstName} {user?.lastName}</Text>
          <Text style={[styles.designation, {color: colors.textSecondary}]}>{employee?.designation}</Text>
        </View>

        <View style={[styles.card, {backgroundColor: colors.card, borderColor: colors.cardBorder}]}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>Personal Information</Text>
          <InfoRow label="Email" value={user?.email || ''} colors={colors} />
          {isEditing ? (
            <View style={styles.editRow}>
              <Text style={[styles.infoLabel, {color: colors.textSecondary}]}>Phone</Text>
              <TextInput
                style={[styles.editInput, {color: colors.text, borderColor: colors.border, backgroundColor: colors.background}]}
                value={editedPhone}
                onChangeText={setEditedPhone}
                placeholder="Enter phone number"
                placeholderTextColor={colors.textDisabled}
                keyboardType="phone-pad"
              />
            </View>
          ) : (
            <InfoRow label="Phone" value={employee?.phone || 'Not set'} colors={colors} />
          )}
          <InfoRow label="Employee Code" value={employee?.employeeCode || ''} colors={colors} />
          <InfoRow label="Department" value={employee?.department?.name || ''} colors={colors} />
          <InfoRow label="Joining Date" value={employee?.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : ''} colors={colors} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({label, value, colors}: {label: string; value: string; colors: typeof Colors.light}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, {color: colors.textSecondary}]}>{label}</Text>
      <Text style={[styles.infoValue, {color: colors.text}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md},
  headerTitle: {fontSize: FontSizes.lg, fontWeight: '600'},
  headerActions: {flexDirection: 'row', gap: Spacing.sm},
  headerButton: {padding: Spacing.xs},
  content: {flex: 1, padding: Spacing.lg},
  avatarSection: {alignItems: 'center', marginBottom: Spacing.xl},
  avatar: {width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md},
  avatarText: {color: '#FFFFFF', fontSize: 36, fontWeight: '700'},
  name: {fontSize: FontSizes.xxl, fontWeight: '700'},
  designation: {fontSize: FontSizes.md},
  card: {padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1},
  sectionTitle: {fontSize: FontSizes.lg, fontWeight: '600', marginBottom: Spacing.md},
  infoRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#E5E7EB'},
  infoLabel: {fontSize: FontSizes.md},
  infoValue: {fontSize: FontSizes.md, fontWeight: '500'},
  editRow: {paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#E5E7EB'},
  editInput: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
});
