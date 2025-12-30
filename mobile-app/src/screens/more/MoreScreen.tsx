import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

import {useAuthStore, useUser} from '../../store/authStore';
import {authStorage} from '../../services/authStorage';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import type {RootStackParamList} from '../../types';
import {showDialog, ALERT_TYPE} from '../../utils/alert';
import AppHeader, {HeaderGradients} from '../../components/AppHeader';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuItem {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
  onPress?: () => void;
  toggle?: boolean;
  screen?: string;
}

export default function MoreScreen() {
  const navigation = useNavigation<NavigationProp>();
  const user = useUser();
  const {logout, isDarkMode, setDarkMode} = useAuthStore();
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const handleLogout = () => {
    showDialog.confirm(
      'Logout',
      'Are you sure you want to logout?',
      async () => {
        await authStorage.clearTokens();
        logout();
      },
      undefined,
      'Logout',
      ALERT_TYPE.WARNING
    );
  };

  const menuItems: MenuItem[] = [
    {
      icon: 'account-circle-outline',
      label: 'Profile',
      color: colors.menuProfile,
      bgColor: colors.menuProfileBg,
      onPress: () => navigation.navigate('Profile'),
    },
    {
      icon: 'bell-outline',
      label: 'Notifications',
      color: colors.menuNotifications,
      bgColor: colors.menuNotificationsBg,
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      icon: 'clock-outline',
      label: 'Timesheet',
      color: colors.menuTimesheet,
      bgColor: colors.menuTimesheetBg,
      onPress: () => navigation.navigate('TimesheetDetail'),
    },
    {
      icon: 'calendar-month-outline',
      label: 'Holiday Calendar',
      color: colors.menuCalendar,
      bgColor: colors.menuCalendarBg,
      onPress: () => navigation.navigate('HolidayCalendar' as never),
    },
    {
      icon: 'weather-night',
      label: 'Dark Mode',
      color: colors.menuDarkMode,
      bgColor: colors.menuDarkModeBg,
      toggle: true,
    },
    {
      icon: 'help-circle-outline',
      label: 'Help & Support',
      color: colors.menuHelp,
      bgColor: colors.menuHelpBg,
    },
    {
      icon: 'information-outline',
      label: 'About',
      color: colors.menuAbout,
      bgColor: colors.menuAboutBg,
    },
  ];

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <AppHeader
        title="Settings"
        subtitle="Manage your account"
        showBack={false}
        gradientColors={HeaderGradients.settings}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <TouchableOpacity
          style={[styles.userCard, {backgroundColor: colors.card}]}
          onPress={() => navigation.navigate('Profile')}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.avatarGradient}>
            <Text style={styles.avatarText}>{user?.firstName?.charAt(0) || 'U'}</Text>
          </LinearGradient>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, {color: colors.text}]}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={[styles.userEmail, {color: colors.textSecondary}]}>{user?.email}</Text>
          </View>
          <View style={[styles.chevronContainer, {backgroundColor: colors.surfaceVariant}]}>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        {/* Menu Items */}
        <View style={[styles.menuCard, {backgroundColor: colors.card}]}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                index < menuItems.length - 1 && {borderBottomColor: colors.border, borderBottomWidth: 1},
              ]}
              onPress={item.toggle ? () => setDarkMode(!isDarkMode) : item.onPress}
              activeOpacity={0.7}>
              <View style={[styles.iconContainer, {backgroundColor: item.bgColor}]}>
                <Icon name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={[styles.menuLabel, {color: colors.text}]}>{item.label}</Text>
              {item.toggle ? (
                <View style={[styles.toggle, {backgroundColor: isDarkMode ? colors.primary : colors.border}]}>
                  <View style={[styles.toggleKnob, isDarkMode && styles.toggleKnobActive]} />
                </View>
              ) : (
                <View style={[styles.chevronSmall, {backgroundColor: colors.surfaceVariant}]}>
                  <Icon name="chevron-right" size={18} color={colors.textSecondary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutButton, {backgroundColor: colors.errorLight}]}
          onPress={handleLogout}
          activeOpacity={0.7}>
          <View style={[styles.logoutIconContainer, {backgroundColor: colors.error}]}>
            <Icon name="logout" size={20} color="#FFFFFF" />
          </View>
          <Text style={[styles.logoutText, {color: colors.error}]}>Logout</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={[styles.versionText, {color: colors.textSecondary}]}>
          HRM Mobile v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: FontSizes.sm,
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuCard: {
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  chevronSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggle: {
    width: 52,
    height: 30,
    borderRadius: 15,
    padding: 3,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    marginLeft: 'auto',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
  },
  logoutIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  logoutText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    fontSize: FontSizes.sm,
    marginBottom: Spacing.xl,
  },
});
