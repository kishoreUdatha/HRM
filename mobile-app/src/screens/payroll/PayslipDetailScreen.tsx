import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Share from 'react-native-share';

import {useAuthStore, useEmployee, useTenant} from '../../store/authStore';
import {payrollApi} from '../../api/payrollApi';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';

export default function PayslipDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const employee = useEmployee();
  const tenant = useTenant();
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;
  const {payslipId} = route.params || {};

  const {data: payslipData} = useQuery({
    queryKey: ['payslip', tenant?._id, employee?._id],
    queryFn: () => payrollApi.getLatestPayslip(tenant?._id || '', employee?._id || ''),
    enabled: !!tenant?._id && !!employee?._id,
  });

  const payslip = payslipData?.data;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(amount);
  };

  const handleDownload = async () => {
    try {
      const response = await payrollApi.downloadPayslipPDF(payslipId);
      if (response.data?.url) {
        await Share.open({url: response.data.url, title: 'Payslip'});
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to download payslip');
    }
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Payslip Details</Text>
        <TouchableOpacity onPress={handleDownload}>
          <Icon name="download" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {payslip && (
          <>
            <View style={[styles.summaryCard, {backgroundColor: colors.primary}]}>
              <Text style={styles.summaryLabel}>Net Salary</Text>
              <Text style={styles.summaryValue}>{formatCurrency(payslip.netSalary)}</Text>
              <Text style={styles.summaryPeriod}>
                {new Date(payslip.year, payslip.month - 1).toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}
              </Text>
            </View>

            <View style={[styles.card, {backgroundColor: colors.card, borderColor: colors.cardBorder}]}>
              <Text style={[styles.sectionTitle, {color: colors.text}]}>Earnings</Text>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, {color: colors.textSecondary}]}>Basic Salary</Text>
                <Text style={[styles.rowValue, {color: colors.text}]}>{formatCurrency(payslip.basicSalary)}</Text>
              </View>
              {payslip.earnings?.map((earning, index) => (
                <View key={index} style={styles.row}>
                  <Text style={[styles.rowLabel, {color: colors.textSecondary}]}>{earning.name}</Text>
                  <Text style={[styles.rowValue, {color: colors.text}]}>{formatCurrency(earning.amount)}</Text>
                </View>
              ))}
              <View style={[styles.totalRow, {borderTopColor: colors.border}]}>
                <Text style={[styles.totalLabel, {color: colors.text}]}>Gross Salary</Text>
                <Text style={[styles.totalValue, {color: colors.success}]}>{formatCurrency(payslip.grossSalary)}</Text>
              </View>
            </View>

            <View style={[styles.card, {backgroundColor: colors.card, borderColor: colors.cardBorder}]}>
              <Text style={[styles.sectionTitle, {color: colors.text}]}>Deductions</Text>
              {payslip.deductions?.map((deduction, index) => (
                <View key={index} style={styles.row}>
                  <Text style={[styles.rowLabel, {color: colors.textSecondary}]}>{deduction.name}</Text>
                  <Text style={[styles.rowValue, {color: colors.error}]}>-{formatCurrency(deduction.amount)}</Text>
                </View>
              ))}
              <View style={[styles.totalRow, {borderTopColor: colors.border}]}>
                <Text style={[styles.totalLabel, {color: colors.text}]}>Total Deductions</Text>
                <Text style={[styles.totalValue, {color: colors.error}]}>-{formatCurrency(payslip.totalDeductions)}</Text>
              </View>
            </View>
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
  content: {flex: 1, padding: Spacing.lg},
  summaryCard: {padding: Spacing.xl, borderRadius: BorderRadius.lg, alignItems: 'center', marginBottom: Spacing.lg},
  summaryLabel: {color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.md},
  summaryValue: {color: '#FFFFFF', fontSize: 36, fontWeight: '700', marginVertical: Spacing.sm},
  summaryPeriod: {color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.md},
  card: {padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: Spacing.lg},
  sectionTitle: {fontSize: FontSizes.lg, fontWeight: '600', marginBottom: Spacing.md},
  row: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm},
  rowLabel: {fontSize: FontSizes.md},
  rowValue: {fontSize: FontSizes.md, fontWeight: '500'},
  totalRow: {flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.md, marginTop: Spacing.sm, borderTopWidth: 1},
  totalLabel: {fontSize: FontSizes.md, fontWeight: '600'},
  totalValue: {fontSize: FontSizes.lg, fontWeight: '700'},
});
