import React from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl} from 'react-native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiClient from '../../api/apiClient';

import {useAuthStore} from '../../store/authStore';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import type {Notification} from '../../types';
import AppHeader, {HeaderGradients} from '../../components/AppHeader';

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const {data: notifications, isLoading, isError, refetch} = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/notifications');
        return response.data;
      } catch (error) {
        console.log('[Notifications] Error fetching notifications:', error);
        return { data: [] };
      }
    },
    retry: false,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({queryKey: ['notifications']}),
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'leave': return 'calendar-remove';
      case 'attendance': return 'clock-check';
      case 'payroll': return 'cash';
      case 'timesheet': return 'clock-outline';
      default: return 'bell';
    }
  };

  const renderNotification = ({item}: {item: Notification}) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.isRead && styles.unread, {backgroundColor: colors.card, borderColor: colors.cardBorder}]}
      onPress={() => !item.isRead && markReadMutation.mutate(item._id)}>
      <View style={[styles.iconContainer, {backgroundColor: colors.primary + '20'}]}>
        <Icon name={getCategoryIcon(item.category)} size={24} color={colors.primary} />
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, {color: colors.text}]}>{item.title}</Text>
        <Text style={[styles.notificationMessage, {color: colors.textSecondary}]} numberOfLines={2}>{item.message}</Text>
        <Text style={[styles.notificationTime, {color: colors.textDisabled}]}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      {!item.isRead && <View style={[styles.unreadDot, {backgroundColor: colors.primary}]} />}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <AppHeader
        title="Notifications"
        gradientColors={HeaderGradients.notifications}
      />

      <FlatList
        data={notifications?.data?.notifications || notifications?.data || []}
        renderItem={renderNotification}
        keyExtractor={(item) => item._id || String(Math.random())}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="bell-off-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
              {isError ? 'Unable to load notifications' : 'No notifications'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md},
  headerTitle: {fontSize: FontSizes.lg, fontWeight: '600'},
  headerSpacer: {width: 24},
  listContent: {padding: Spacing.lg},
  notificationItem: {flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.sm},
  unread: {borderLeftWidth: 3},
  iconContainer: {width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md},
  notificationContent: {flex: 1},
  notificationTitle: {fontSize: FontSizes.md, fontWeight: '600'},
  notificationMessage: {fontSize: FontSizes.sm, marginTop: 2},
  notificationTime: {fontSize: FontSizes.xs, marginTop: Spacing.xs},
  unreadDot: {width: 8, height: 8, borderRadius: 4},
  emptyState: {alignItems: 'center', paddingVertical: Spacing.xxl},
  emptyText: {fontSize: FontSizes.md, marginTop: Spacing.md},
});
