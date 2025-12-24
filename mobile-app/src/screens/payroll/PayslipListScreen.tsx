import React from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

import {useAuthStore, useEmployee, useTenant} from '../../store/authStore';
import {payrollApi} from '../../api/payrollApi';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import type {RootStackParamList, Payslip} from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

export default function PayslipListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const employee = useEmployee();
  const tenant = useTenant();
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const {data: payslips, isLoading, refetch} = useQuery({
    queryKey: ['payslips', tenant?._id, employee?._id],
    queryFn: () => payrollApi.getPayslips(tenant?._id || '', employee?._id || ''),
    enabled: !!tenant?._id && !!employee?._id,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(amount);
  };

  const renderPayslip = ({item, index}: {item: Payslip; index: number}) => {
    const colorSet = monthColors[(item.month - 1) % monthColors.length];
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
          <View style={[styles.chevronContainer, {backgroundColor: colors.surfaceVariant}]}>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </View>
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

  // Calculate totals for header stats
  const currentYear = new Date().getFullYear();
  const currentYearPayslips = payslips?.data?.filter(p => p.year === currentYear) || [];
  const totalEarnings = currentYearPayslips.reduce((sum, p) => sum + p.netSalary, 0);
  const avgSalary = currentYearPayslips.length > 0 ? totalEarnings / currentYearPayslips.length : 0;

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

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Icon name="wallet" size={20} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{formatCurrency(totalEarnings)}</Text>
            <Text style={styles.statLabel}>{currentYear} Earnings</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Icon name="chart-line" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{formatCurrency(avgSalary)}</Text>
            <Text style={styles.statLabel}>Avg Monthly</Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={payslips?.data || []}
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
            <Text style={[styles.listHeaderText, {color: colors.text}]}>Recent Payslips</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, {backgroundColor: '#D1FAE5'}]}>
              <Icon name="cash-remove" size={48} color="#10B981" />
            </View>
            <Text style={[styles.emptyText, {color: colors.text}]}>No payslips available</Text>
            <Text style={[styles.emptySubtext, {color: colors.textSecondary}]}>
              Your payslips will appear here once processed
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
    marginBottom: Spacing.lg,
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
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
