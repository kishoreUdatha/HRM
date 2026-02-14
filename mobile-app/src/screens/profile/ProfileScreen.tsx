import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal} from 'react-native';
import {useMutation} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAuthStore, useUser, useEmployee} from '../../store/authStore';
import apiClient from '../../api/apiClient';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import {showToast} from '../../utils/alert';
import AppHeader, {HeaderGradients} from '../../components/AppHeader';

interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  branchName?: string;
  accountType?: 'savings' | 'current';
}

export default function ProfileScreen() {
  const user = useUser();
  const employee = useEmployee();
  const {isDarkMode, setEmployee} = useAuthStore();
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const [isEditing, setIsEditing] = useState(false);
  const [editedPhone, setEditedPhone] = useState(employee?.phone || '');

  // Bank details modal state
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    bankName: employee?.bankDetails?.bankName || '',
    accountNumber: employee?.bankDetails?.accountNumber || '',
    ifscCode: employee?.bankDetails?.ifscCode || '',
    accountHolderName: employee?.bankDetails?.accountHolderName || '',
    branchName: employee?.bankDetails?.branchName || '',
    accountType: employee?.bankDetails?.accountType || 'savings',
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: {phone?: string; bankDetails?: BankDetails}) => {
      const response = await apiClient.patch('/employees/me/profile', data);
      return response.data;
    },
    onSuccess: (response) => {
      if (response.success && response.data?.employee) {
        setEmployee(response.data.employee);
        showToast.success('Success', 'Profile updated successfully');
        setIsEditing(false);
        setShowBankModal(false);
      }
    },
    onError: () => {
      showToast.error('Error', 'Failed to update profile');
    },
  });

  const handleSavePhone = () => {
    updateProfileMutation.mutate({phone: editedPhone});
  };

  const handleSaveBankDetails = () => {
    // Validate required fields
    if (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.accountHolderName) {
      showToast.error('Error', 'Please fill all required fields');
      return;
    }
    updateProfileMutation.mutate({bankDetails});
  };

  const handleCancel = () => {
    setEditedPhone(employee?.phone || '');
    setIsEditing(false);
  };

  const handleCancelBankModal = () => {
    setBankDetails({
      bankName: employee?.bankDetails?.bankName || '',
      accountNumber: employee?.bankDetails?.accountNumber || '',
      ifscCode: employee?.bankDetails?.ifscCode || '',
      accountHolderName: employee?.bankDetails?.accountHolderName || '',
      branchName: employee?.bankDetails?.branchName || '',
      accountType: employee?.bankDetails?.accountType || 'savings',
    });
    setShowBankModal(false);
  };

  const renderRightComponent = () => {
    if (isEditing) {
      return (
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <Icon name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSavePhone} style={styles.headerButton}>
            <Icon name="check" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <TouchableOpacity onPress={() => setIsEditing(true)}>
        <Icon name="pencil" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    );
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (!accountNumber || accountNumber.length < 4) return accountNumber;
    return '****' + accountNumber.slice(-4);
  };

  const hasBankDetails = employee?.bankDetails?.accountNumber;

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <AppHeader
        title="Profile"
        gradientColors={HeaderGradients.profile}
        rightComponent={renderRightComponent()}
      />

      <ScrollView style={styles.content}>
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, {backgroundColor: colors.primary}]}>
            <Text style={styles.avatarText}>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</Text>
          </View>
          <Text style={[styles.name, {color: colors.text}]}>{user?.firstName} {user?.lastName}</Text>
          <Text style={[styles.designation, {color: colors.textSecondary}]}>{employee?.designation}</Text>
        </View>

        {/* Personal Information Card */}
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

        {/* Bank Account Card */}
        <View style={[styles.card, {backgroundColor: colors.card, borderColor: colors.cardBorder, marginTop: Spacing.lg}]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, {color: colors.text}]}>Bank Account</Text>
            <TouchableOpacity
              onPress={() => setShowBankModal(true)}
              style={[styles.editButton, {backgroundColor: colors.primary + '15'}]}
            >
              <Icon name={hasBankDetails ? "pencil" : "plus"} size={18} color={colors.primary} />
              <Text style={[styles.editButtonText, {color: colors.primary}]}>
                {hasBankDetails ? 'Edit' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>

          {hasBankDetails ? (
            <>
              <InfoRow label="Bank Name" value={employee?.bankDetails?.bankName || ''} colors={colors} />
              <InfoRow label="Account Number" value={maskAccountNumber(employee?.bankDetails?.accountNumber || '')} colors={colors} />
              <InfoRow label="IFSC Code" value={employee?.bankDetails?.ifscCode || ''} colors={colors} />
              <InfoRow label="Account Holder" value={employee?.bankDetails?.accountHolderName || ''} colors={colors} />
              {employee?.bankDetails?.branchName && (
                <InfoRow label="Branch" value={employee?.bankDetails?.branchName} colors={colors} />
              )}
              <InfoRow
                label="Account Type"
                value={(employee?.bankDetails?.accountType || 'savings').charAt(0).toUpperCase() + (employee?.bankDetails?.accountType || 'savings').slice(1)}
                colors={colors}
              />
            </>
          ) : (
            <View style={styles.emptyBankSection}>
              <Icon name="bank-outline" size={48} color={colors.textDisabled} />
              <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
                No bank account details added
              </Text>
              <Text style={[styles.emptySubtext, {color: colors.textDisabled}]}>
                Add your bank details for salary payments
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bank Details Modal */}
      <Modal
        visible={showBankModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelBankModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {backgroundColor: colors.card}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: colors.text}]}>
                {hasBankDetails ? 'Edit Bank Details' : 'Add Bank Details'}
              </Text>
              <TouchableOpacity onPress={handleCancelBankModal}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, {color: colors.text}]}>Bank Name *</Text>
                <TextInput
                  style={[styles.modalInput, {color: colors.text, borderColor: colors.border, backgroundColor: colors.background}]}
                  value={bankDetails.bankName}
                  onChangeText={(text) => setBankDetails({...bankDetails, bankName: text})}
                  placeholder="e.g., State Bank of India"
                  placeholderTextColor={colors.textDisabled}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, {color: colors.text}]}>Account Number *</Text>
                <TextInput
                  style={[styles.modalInput, {color: colors.text, borderColor: colors.border, backgroundColor: colors.background}]}
                  value={bankDetails.accountNumber}
                  onChangeText={(text) => setBankDetails({...bankDetails, accountNumber: text})}
                  placeholder="Enter account number"
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, {color: colors.text}]}>IFSC Code *</Text>
                <TextInput
                  style={[styles.modalInput, {color: colors.text, borderColor: colors.border, backgroundColor: colors.background}]}
                  value={bankDetails.ifscCode}
                  onChangeText={(text) => setBankDetails({...bankDetails, ifscCode: text.toUpperCase()})}
                  placeholder="e.g., SBIN0001234"
                  placeholderTextColor={colors.textDisabled}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, {color: colors.text}]}>Account Holder Name *</Text>
                <TextInput
                  style={[styles.modalInput, {color: colors.text, borderColor: colors.border, backgroundColor: colors.background}]}
                  value={bankDetails.accountHolderName}
                  onChangeText={(text) => setBankDetails({...bankDetails, accountHolderName: text})}
                  placeholder="Name as per bank records"
                  placeholderTextColor={colors.textDisabled}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, {color: colors.text}]}>Branch Name</Text>
                <TextInput
                  style={[styles.modalInput, {color: colors.text, borderColor: colors.border, backgroundColor: colors.background}]}
                  value={bankDetails.branchName}
                  onChangeText={(text) => setBankDetails({...bankDetails, branchName: text})}
                  placeholder="e.g., Main Branch"
                  placeholderTextColor={colors.textDisabled}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, {color: colors.text}]}>Account Type</Text>
                <View style={styles.accountTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.accountTypeButton,
                      {borderColor: colors.border},
                      bankDetails.accountType === 'savings' && {backgroundColor: colors.primary, borderColor: colors.primary},
                    ]}
                    onPress={() => setBankDetails({...bankDetails, accountType: 'savings'})}
                  >
                    <Text style={[
                      styles.accountTypeText,
                      {color: bankDetails.accountType === 'savings' ? '#FFFFFF' : colors.text},
                    ]}>Savings</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.accountTypeButton,
                      {borderColor: colors.border},
                      bankDetails.accountType === 'current' && {backgroundColor: colors.primary, borderColor: colors.primary},
                    ]}
                    onPress={() => setBankDetails({...bankDetails, accountType: 'current'})}
                  >
                    <Text style={[
                      styles.accountTypeText,
                      {color: bankDetails.accountType === 'current' ? '#FFFFFF' : colors.text},
                    ]}>Current</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, {borderColor: colors.border}]}
                onPress={handleCancelBankModal}
              >
                <Text style={[styles.cancelButtonText, {color: colors.text}]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, {backgroundColor: colors.primary}]}
                onPress={handleSaveBankDetails}
                disabled={updateProfileMutation.isPending}
              >
                <Text style={styles.saveButtonText}>
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md},
  sectionTitle: {fontSize: FontSizes.lg, fontWeight: '600'},
  editButton: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md, gap: Spacing.xs},
  editButtonText: {fontSize: FontSizes.sm, fontWeight: '600'},
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
  emptyBankSection: {alignItems: 'center', paddingVertical: Spacing.xl},
  emptyText: {fontSize: FontSizes.md, marginTop: Spacing.md},
  emptySubtext: {fontSize: FontSizes.sm, marginTop: Spacing.xs},
  // Modal styles
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'},
  modalContent: {borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: '90%'},
  modalHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: '#E5E7EB'},
  modalTitle: {fontSize: FontSizes.xl, fontWeight: '700'},
  modalBody: {padding: Spacing.lg},
  inputGroup: {marginBottom: Spacing.lg},
  inputLabel: {fontSize: FontSizes.sm, fontWeight: '600', marginBottom: Spacing.xs},
  modalInput: {
    fontSize: FontSizes.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  accountTypeContainer: {flexDirection: 'row', gap: Spacing.md},
  accountTypeButton: {flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center'},
  accountTypeText: {fontSize: FontSizes.md, fontWeight: '500'},
  modalFooter: {flexDirection: 'row', padding: Spacing.lg, gap: Spacing.md, borderTopWidth: 1, borderTopColor: '#E5E7EB'},
  cancelButton: {flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center'},
  cancelButtonText: {fontSize: FontSizes.md, fontWeight: '600'},
  saveButton: {flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center'},
  saveButtonText: {color: '#FFFFFF', fontSize: FontSizes.md, fontWeight: '600'},
});
