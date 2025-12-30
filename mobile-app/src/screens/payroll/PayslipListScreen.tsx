import React, {useState} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

import {useAuthStore, useEmployee, useTenant, useUser} from '../../store/authStore';
import {payrollApi} from '../../api/payrollApi';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import type {RootStackParamList, Payslip} from '../../types';
import {showToast} from '../../utils/alert';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// API Base URL for direct downloads
const API_BASE_URL = 'http://localhost:3000/api';

const monthColors = [
  {color: '#10B981', bg: '#D1FAE5'},
  {color: '#3B82F6', bg: '#DBEAFE'},
  {color: '#EC4899', bg: '#FCE7F3'},
  {color: '#F59E0B', bg: '#FEF3C7'},
  {color: '#8B5CF6', bg: '#EDE9FE'},
  {color: '#06B6D4', bg: '#CFFAFE'},
  {color: '#EF4444', bg: '#FEE2E2'},
  {color: '#84CC16', bg: '#ECFCCB'},
  {color: '#14B8A6', bg: '#CCFBF1'},
  {color: '#F97316', bg: '#FED7AA'},
  {color: '#6366F1', bg: '#E0E7FF'},
  {color: '#D946EF', bg: '#FAE8FF'},
];

// Get financial years for picker (current and previous 2 years)
const getFinancialYears = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Financial year in India runs from April to March
  const currentFY = currentMonth >= 4 ? currentYear : currentYear - 1;

  return [
    {label: `FY ${currentFY}-${(currentFY + 1).toString().slice(-2)}`, startYear: currentFY, endYear: currentFY + 1},
    {label: `FY ${currentFY - 1}-${currentFY.toString().slice(-2)}`, startYear: currentFY - 1, endYear: currentFY},
    {label: `FY ${currentFY - 2}-${(currentFY - 1).toString().slice(-2)}`, startYear: currentFY - 2, endYear: currentFY - 1},
  ];
};

const getMonthName = (month: number) => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1] || '';
};

export default function PayslipListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const employee = useEmployee();
  const user = useUser();
  const tenant = useTenant();
  const tokens = useAuthStore(state => state.tokens);
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  // Use employee._id if available, otherwise fallback to user's employeeId or user._id
  const effectiveEmployeeId = employee?._id || user?.employeeId || user?._id;

  const financialYears = getFinancialYears();
  const [selectedFY, setSelectedFY] = useState(0); // Index of selected FY
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const {data: payslips, isLoading, refetch} = useQuery({
    queryKey: ['payslips', tenant?._id, effectiveEmployeeId],
    queryFn: async () => {
      console.log('[PayslipList] Fetching payslips...');
      console.log('[PayslipList] Tenant ID:', tenant?._id);
      console.log('[PayslipList] Employee ID:', effectiveEmployeeId);
      const result = await payrollApi.getPayslips(tenant?._id || '', effectiveEmployeeId || '');
      console.log('[PayslipList] API Response:', JSON.stringify(result, null, 2));
      return result;
    },
    enabled: !!tenant?._id && !!effectiveEmployeeId,
  });

  // Debug logging
  console.log('[PayslipList] tenant._id:', tenant?._id);
  console.log('[PayslipList] effectiveEmployeeId:', effectiveEmployeeId);
  console.log('[PayslipList] payslips data:', payslips?.data?.length, 'items');
  if (payslips?.data?.[0]) {
    console.log('[PayslipList] First payslip netSalary:', payslips.data[0].netSalary);
  }

  const formatCurrency = (amount: number) => {
    const num = Number(amount);
    if (!isFinite(num) || isNaN(num)) {
      return '₹0';
    }
    // Manual Indian number formatting (Hermes-safe, no Intl dependency)
    const absNum = Math.abs(Math.round(num));
    const numStr = absNum.toString();
    let result = '';
    const len = numStr.length;

    if (len <= 3) {
      result = numStr;
    } else {
      // Last 3 digits
      result = numStr.slice(-3);
      let remaining = numStr.slice(0, -3);
      // Add remaining digits in groups of 2
      while (remaining.length > 0) {
        const chunk = remaining.slice(-2);
        result = chunk + ',' + result;
        remaining = remaining.slice(0, -2);
      }
    }

    return num < 0 ? `-₹${result}` : `₹${result}`;
  };

  // Filter payslips by financial year (April to March)
  const filterByFinancialYear = (payslipList: Payslip[]) => {
    const fy = financialYears[selectedFY];
    return payslipList.filter(p => {
      // April-Dec of start year or Jan-March of end year
      if (p.year === fy.startYear && p.month >= 4) return true;
      if (p.year === fy.endYear && p.month <= 3) return true;
      return false;
    });
  };

  const handleDownload = async (payslip: Payslip) => {
    if (!tenant?._id || !effectiveEmployeeId) {
      showToast.error('Error', 'Unable to download payslip. Missing required data.');
      return;
    }

    setDownloadingId(payslip._id);

    try {
      const downloadUrl = `${API_BASE_URL}${payrollApi.getPayslipDownloadUrl(tenant._id, effectiveEmployeeId, payslip._id)}`;
      const fileName = `Payslip_${getMonthName(payslip.month)}_${payslip.year}.pdf`;
      const downloadPath = Platform.OS === 'ios'
        ? `${RNFS.DocumentDirectoryPath}/${fileName}`
        : `${RNFS.DownloadDirectoryPath}/${fileName}`;

      const downloadResult = await RNFS.downloadFile({
        fromUrl: downloadUrl,
        toFile: downloadPath,
        headers: {
          'Authorization': `Bearer ${tokens?.accessToken}`,
          'X-Tenant-ID': tenant._id,
        },
      }).promise;

      if (downloadResult.statusCode === 200) {
        await Share.open({
          url: Platform.OS === 'ios' ? downloadPath : `file://${downloadPath}`,
          title: `Payslip - ${getMonthName(payslip.month)} ${payslip.year}`,
          type: 'application/pdf',
          filename: fileName,
        });
        showToast.success('Success', `Payslip downloaded${Platform.OS === 'android' ? ' to Downloads' : ''}`);
      } else {
        throw new Error('Download failed');
      }
    } catch (error: any) {
      if (!error.message?.includes('User did not share')) {
        showToast.error('Error', 'Failed to download payslip');
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const renderPayslip = ({item, index}: {item: Payslip; index: number}) => {
    const colorSet = monthColors[(item.month - 1) % monthColors.length];
    const isDownloading = downloadingId === item._id;

    // Debug: log the item values being rendered
    console.log('[PayslipList] Rendering item:', item._id);
    console.log('[PayslipList] Item netSalary:', item.netSalary, typeof item.netSalary);
    console.log('[PayslipList] Item grossSalary:', item.grossSalary, typeof item.grossSalary);
    console.log('[PayslipList] Formatted netSalary:', formatCurrency(item.netSalary));

    return (
      <TouchableOpacity
        style={[styles.payslipCard, {backgroundColor: colors.card}]}
        onPress={() => navigation.navigate('PayslipDetail', {payslipId: item._id})}>
        <View style={styles.payslipHeader}>
          <View style={[styles.monthBadge, {backgroundColor: colorSet.bg}]}>
            <Text style={[styles.monthText, {color: colorSet.color}]}>
              {new Date(item.year, item.month - 1).toLocaleDateString('en-US', {month: 'short'})}
            </Text>
            <Text style={[styles.yearText, {color: colorSet.color}]}>{item.year}</Text>
          </View>
          <View style={styles.payslipInfo}>
            <Text style={[styles.netSalary, {color: colors.text}]}>{formatCurrency(item.netSalary)}</Text>
            <Text style={[styles.statusLabel, {color: colors.textSecondary}]}>Net Salary</Text>
          </View>
          <TouchableOpacity
            style={[styles.downloadBtn, {backgroundColor: colorSet.bg}]}
            onPress={(e) => {
              e.stopPropagation();
              handleDownload(item);
            }}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={colorSet.color} />
            ) : (
              <Icon name="download" size={20} color={colorSet.color} />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.payslipDetails}>
          <View style={[styles.detailItem, {backgroundColor: '#D1FAE5'}]}>
            <Icon name="arrow-up-circle" size={16} color="#10B981" />
            <View>
              <Text style={[styles.detailLabel, {color: '#10B981'}]}>Gross</Text>
              <Text style={[styles.detailValue, {color: '#10B981'}]}>{formatCurrency(item.grossSalary)}</Text>
            </View>
          </View>
          <View style={[styles.detailItem, {backgroundColor: '#FEE2E2'}]}>
            <Icon name="arrow-down-circle" size={16} color="#EF4444" />
            <View>
              <Text style={[styles.detailLabel, {color: '#EF4444'}]}>Deductions</Text>
              <Text style={[styles.detailValue, {color: '#EF4444'}]}>-{formatCurrency(item.totalDeductions)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Filter and calculate stats
  const allPayslips = payslips?.data || [];
  const filteredPayslips = filterByFinancialYear(allPayslips);
  const totalEarnings = filteredPayslips.reduce((sum, p) => sum + p.netSalary, 0);
  const avgSalary = filteredPayslips.length > 0 ? totalEarnings / filteredPayslips.length : 0;

  // Debug stats
  console.log('[PayslipList] allPayslips count:', allPayslips.length);
  console.log('[PayslipList] filteredPayslips count:', filteredPayslips.length);
  console.log('[PayslipList] totalEarnings:', totalEarnings);
  console.log('[PayslipList] avgSalary:', avgSalary);
  console.log('[PayslipList] selectedFY:', selectedFY, financialYears[selectedFY]);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]} edges={['top']}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#10B981', '#34D399']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.headerGradient}>
        <Text style={styles.headerTitle}>Payslips</Text>
        <Text style={styles.headerSubtitle}>Your salary history</Text>

        {/* Financial Year Picker */}
        <View style={styles.fyPickerContainer}>
          {financialYears.map((fy, index) => (
            <TouchableOpacity
              key={fy.label}
              style={[
                styles.fyPill,
                selectedFY === index && styles.fyPillSelected,
              ]}
              onPress={() => setSelectedFY(index)}
            >
              <Text style={[
                styles.fyPillText,
                selectedFY === index && styles.fyPillTextSelected,
              ]}>
                {fy.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Icon name="wallet" size={20} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{formatCurrency(totalEarnings)}</Text>
            <Text style={styles.statLabel}>{financialYears[selectedFY].label} Earnings</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, {backgroundColor: '#DBEAFE'}]}>
              <Icon name="chart-line" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{formatCurrency(avgSalary)}</Text>
            <Text style={styles.statLabel}>Avg Monthly</Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={filteredPayslips}
        renderItem={renderPayslip}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={[styles.listHeaderIcon, {backgroundColor: '#D1FAE5'}]}>
              <Icon name="file-document-multiple" size={20} color="#10B981" />
            </View>
            <Text style={[styles.listHeaderText, {color: colors.text}]}>
              {financialYears[selectedFY].label} Payslips ({filteredPayslips.length})
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, {backgroundColor: '#D1FAE5'}]}>
              <Icon name="cash-remove" size={48} color="#10B981" />
            </View>
            <Text style={[styles.emptyText, {color: colors.text}]}>No payslips for {financialYears[selectedFY].label}</Text>
            <Text style={[styles.emptySubtext, {color: colors.textSecondary}]}>
              Payslips will appear here once processed
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl + 40,
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
    marginBottom: Spacing.sm,
  },
  fyPickerContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  fyPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  fyPillSelected: {
    backgroundColor: '#FFFFFF',
  },
  fyPillText: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  fyPillTextSelected: {
    color: '#10B981',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: '#64748B',
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: 0,
    marginTop: -30,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  listHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  listHeaderText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  payslipCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  payslipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  monthBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  monthText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  yearText: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
  },
  payslipInfo: {
    flex: 1,
  },
  netSalary: {
    fontSize: 24,
    fontWeight: '700',
  },
  statusLabel: {
    fontSize: FontSizes.sm,
  },
  downloadBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payslipDetails: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  detailLabel: {
    fontSize: FontSizes.xs,
  },
  detailValue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontSize: FontSizes.md,
    textAlign: 'center',
  },
});
