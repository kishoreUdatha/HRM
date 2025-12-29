import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';

import {useAuthStore, useEmployee, useTenant} from '../../store/authStore';
import {payrollApi} from '../../api/payrollApi';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';

// API Base URL for direct downloads
const API_BASE_URL = 'http://135.171.160.105/api';

export default function PayslipDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const employee = useEmployee();
  const tenant = useTenant();
  const tokens = useAuthStore(state => state.tokens);
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;
  const {payslipId} = route.params || {};
  const [isDownloading, setIsDownloading] = useState(false);

  const {data: payslipData, isLoading} = useQuery({
    queryKey: ['payslip', tenant?._id, employee?._id, payslipId],
    queryFn: () => {
      if (payslipId) {
        return payrollApi.getPayslipById(tenant?._id || '', employee?._id || '', payslipId);
      }
      return payrollApi.getLatestPayslip(tenant?._id || '', employee?._id || '');
    },
    enabled: !!tenant?._id && !!employee?._id,
  });

  const payslip = payslipData?.data;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 0}).format(amount);
  };

  const getMonthName = (month: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1] || '';
  };

  const handleDownload = async () => {
    if (!payslip || !tenant?._id || !employee?._id) {
      Alert.alert('Error', 'Unable to download payslip. Missing required data.');
      return;
    }

    setIsDownloading(true);

    try {
      const downloadUrl = `${API_BASE_URL}${payrollApi.getPayslipDownloadUrl(tenant._id, employee._id, payslip._id)}`;
      const fileName = `Payslip_${getMonthName(payslip.month)}_${payslip.year}.pdf`;
      const downloadPath = Platform.OS === 'ios'
        ? `${RNFS.DocumentDirectoryPath}/${fileName}`
        : `${RNFS.DownloadDirectoryPath}/${fileName}`;

      // Download the file
      const downloadResult = await RNFS.downloadFile({
        fromUrl: downloadUrl,
        toFile: downloadPath,
        headers: {
          'Authorization': `Bearer ${tokens?.accessToken}`,
          'X-Tenant-ID': tenant._id,
        },
      }).promise;

      if (downloadResult.statusCode === 200) {
        // Share the downloaded file
        await Share.open({
          url: Platform.OS === 'ios' ? downloadPath : `file://${downloadPath}`,
          title: `Payslip - ${getMonthName(payslip.month)} ${payslip.year}`,
          type: 'application/pdf',
          filename: fileName,
        });

        Alert.alert('Success', `Payslip downloaded successfully${Platform.OS === 'android' ? ' to Downloads folder' : ''}`);
      } else {
        throw new Error('Download failed');
      }
    } catch (error: any) {
      console.error('Download error:', error);
      if (error.message?.includes('User did not share')) {
        // User cancelled share, file is still downloaded
        Alert.alert('Downloaded', `Payslip saved${Platform.OS === 'android' ? ' to Downloads folder' : ''}`);
      } else {
        Alert.alert('Error', 'Failed to download payslip. Please try again.');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, {color: colors.textSecondary}]}>Loading payslip...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Payslip Details</Text>
        <TouchableOpacity onPress={handleDownload} disabled={isDownloading || !payslip}>
          {isDownloading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Icon name="download" size={24} color={payslip ? colors.primary : colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {payslip ? (
          <>
            <View style={[styles.summaryCard, {backgroundColor: colors.primary}]}>
              <Text style={styles.summaryLabel}>Net Salary</Text>
              <Text style={styles.summaryValue}>{formatCurrency(payslip.netSalary)}</Text>
              <Text style={styles.summaryPeriod}>
                {getMonthName(payslip.month)} {payslip.year}
              </Text>
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="file-pdf-box" size={20} color="#FFFFFF" />
                    <Text style={styles.downloadButtonText}>Download PDF</Text>
                  </>
                )}
              </TouchableOpacity>
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
        ) : (
          <View style={styles.emptyState}>
            <Icon name="file-document-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, {color: colors.text}]}>No payslip found</Text>
            <Text style={[styles.emptySubtext, {color: colors.textSecondary}]}>
              Payslips will appear here once processed
            </Text>
          </View>
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
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  loadingText: {marginTop: Spacing.md, fontSize: FontSizes.md},
  summaryCard: {padding: Spacing.xl, borderRadius: BorderRadius.lg, alignItems: 'center', marginBottom: Spacing.lg},
  summaryLabel: {color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.md},
  summaryValue: {color: '#FFFFFF', fontSize: 36, fontWeight: '700', marginVertical: Spacing.sm},
  summaryPeriod: {color: 'rgba(255,255,255,0.8)', fontSize: FontSizes.md},
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  downloadButtonText: {color: '#FFFFFF', fontSize: FontSizes.md, fontWeight: '600'},
  card: {padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: Spacing.lg},
  sectionTitle: {fontSize: FontSizes.lg, fontWeight: '600', marginBottom: Spacing.md},
  row: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm},
  rowLabel: {fontSize: FontSizes.md},
  rowValue: {fontSize: FontSizes.md, fontWeight: '500'},
  totalRow: {flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.md, marginTop: Spacing.sm, borderTopWidth: 1},
  totalLabel: {fontSize: FontSizes.md, fontWeight: '600'},
  totalValue: {fontSize: FontSizes.lg, fontWeight: '700'},
  emptyState: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: Spacing.xxl},
  emptyText: {fontSize: FontSizes.lg, fontWeight: '600', marginTop: Spacing.md},
  emptySubtext: {fontSize: FontSizes.md, textAlign: 'center', marginTop: Spacing.xs},
});
