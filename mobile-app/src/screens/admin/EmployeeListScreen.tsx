import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAuthStore} from '../../store/authStore';
import {adminApi} from '../../api/adminApi';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import AppHeader, {HeaderGradients} from '../../components/AppHeader';
import type {RootStackParamList, Employee} from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const statusColors: Record<string, {color: string; bg: string; label: string}> = {
  active: {color: '#10B981', bg: '#D1FAE5', label: 'Active'},
  inactive: {color: '#64748B', bg: '#F1F5F9', label: 'Inactive'},
  terminated: {color: '#EF4444', bg: '#FEE2E2', label: 'Terminated'},
  'on-leave': {color: '#3B82F6', bg: '#DBEAFE', label: 'On Leave'},
};

interface EmployeeItemProps {
  item: Employee;
  onPress: () => void;
}

function EmployeeItem({item, onPress}: EmployeeItemProps) {
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;
  const status = statusColors[item.status] || statusColors.active;

  return (
    <TouchableOpacity
      style={[styles.employeeItem, {backgroundColor: colors.card}]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={[styles.avatar, {backgroundColor: colors.primary + '20'}]}>
        {item.profileImage ? (
          <Icon name="account" size={24} color={colors.primary} />
        ) : (
          <Text style={[styles.avatarText, {color: colors.primary}]}>
            {item.firstName.charAt(0)}{item.lastName.charAt(0)}
          </Text>
        )}
      </View>

      <View style={styles.employeeInfo}>
        <Text style={[styles.employeeName, {color: colors.text}]}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={[styles.employeeCode, {color: colors.textSecondary}]}>
          {item.employeeCode}
        </Text>
        <View style={styles.detailsRow}>
          {item.department && (
            <View style={styles.detailItem}>
              <Icon name="domain" size={12} color={colors.textSecondary} />
              <Text style={[styles.detailText, {color: colors.textSecondary}]}>
                {typeof item.department === 'object' ? item.department.name : item.department}
              </Text>
            </View>
          )}
          {item.designation && (
            <View style={styles.detailItem}>
              <Icon name="briefcase-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.detailText, {color: colors.textSecondary}]}>
                {item.designation}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.rightSection}>
        <View style={[styles.statusBadge, {backgroundColor: status.bg}]}>
          <Text style={[styles.statusText, {color: status.color}]}>{status.label}</Text>
        </View>
        <Icon name="chevron-right" size={20} color={colors.textDisabled} />
      </View>
    </TouchableOpacity>
  );
}

export default function EmployeeListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const [searchQuery, setSearchQuery] = useState('');

  // Fetch employees
  const {
    data: employeesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['employees'],
    queryFn: () => adminApi.getEmployees({limit: 1000}),
    staleTime: 60000,
  });

  const allEmployees = employeesData?.data?.employees || [];

  // Filter employees by search
  const employees = allEmployees.filter(emp => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      emp.firstName.toLowerCase().includes(search) ||
      emp.lastName.toLowerCase().includes(search) ||
      emp.employeeCode.toLowerCase().includes(search) ||
      emp.email?.toLowerCase().includes(search)
    );
  });

  // Count by status
  const activeCount = allEmployees.filter(e => e.status === 'active').length;
  const inactiveCount = allEmployees.filter(e => e.status !== 'active').length;

  const renderHeader = () => (
    <View>
      {/* Search Bar */}
      <View style={[styles.searchContainer, {backgroundColor: colors.card}]}>
        <Icon name="magnify" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, {color: colors.text}]}
          placeholder="Search employees..."
          placeholderTextColor={colors.textDisabled}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Summary Row */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, {backgroundColor: '#D1FAE5'}]}>
          <Text style={[styles.summaryValue, {color: '#10B981'}]}>{activeCount}</Text>
          <Text style={[styles.summaryLabel, {color: '#059669'}]}>Active</Text>
        </View>
        <View style={[styles.summaryCard, {backgroundColor: '#F1F5F9'}]}>
          <Text style={[styles.summaryValue, {color: '#64748B'}]}>{inactiveCount}</Text>
          <Text style={[styles.summaryLabel, {color: '#475569'}]}>Inactive</Text>
        </View>
        <View style={[styles.summaryCard, {backgroundColor: '#EEF2FF'}]}>
          <Text style={[styles.summaryValue, {color: '#6366F1'}]}>{allEmployees.length}</Text>
          <Text style={[styles.summaryLabel, {color: '#4F46E5'}]}>Total</Text>
        </View>
      </View>

      {/* Results Count */}
      <View style={styles.countRow}>
        <Text style={[styles.countText, {color: colors.textSecondary}]}>
          {searchQuery ? `Found ${employees.length} employees` : `${employees.length} employees`}
        </Text>
      </View>
    </View>
  );

  const renderItem = useCallback(
    ({item}: {item: Employee}) => (
      <EmployeeItem
        item={item}
        onPress={() => navigation.navigate('EmployeeSalaryDetail' as any, {employeeId: item._id})}
      />
    ),
    [navigation]
  );

  const keyExtractor = useCallback((item: Employee) => item._id, []);

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <AppHeader
        title="Employees"
        subtitle={`${allEmployees.length} Total`}
        gradientColors={HeaderGradients.profile}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, {color: colors.textSecondary}]}>
            Loading employees...
          </Text>
        </View>
      ) : (
        <FlatList
          data={employees}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Icon name="account-search-outline" size={64} color={colors.textDisabled} />
              <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
                No employees found
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.md,
    marginLeft: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginHorizontal: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  countRow: {
    marginBottom: Spacing.md,
  },
  countText: {
    fontSize: FontSizes.sm,
  },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  employeeCode: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  detailText: {
    fontSize: FontSizes.xs,
    marginLeft: 4,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  separator: {
    height: Spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyText: {
    fontSize: FontSizes.md,
    marginTop: Spacing.md,
  },
});
