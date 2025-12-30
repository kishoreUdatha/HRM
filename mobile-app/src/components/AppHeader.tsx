import React, {useCallback} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, StatusBar} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAuthStore} from '../store/authStore';
import {Colors} from '../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../theme/spacing';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightIcon?: string;
  onRightPress?: () => void;
  rightComponent?: React.ReactNode;
  gradientColors?: string[];
  large?: boolean;
  children?: React.ReactNode;
  extraPadding?: number;
}

export default function AppHeader({
  title,
  subtitle,
  showBack = true,
  rightIcon,
  onRightPress,
  rightComponent,
  gradientColors,
  large = false,
  children,
  extraPadding = 0,
}: AppHeaderProps) {
  const navigation = useNavigation();
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  // Default gradient colors based on theme
  const defaultGradient = [colors.gradientStart, colors.gradientEnd];
  const gradient = gradientColors || defaultGradient;

  // Update StatusBar when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content');
      StatusBar.setBackgroundColor(gradient[0]);
      StatusBar.setTranslucent(false);
    }, [gradient])
  );

  return (
    <>
      <LinearGradient
        colors={gradient}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[
          styles.header,
          large && styles.headerLarge,
          children && styles.headerWithChildren,
          extraPadding > 0 && {paddingBottom: extraPadding},
        ]}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.headerContent}>
            {showBack ? (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Icon name="arrow-left" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <View style={styles.spacer} />
            )}

            <View style={styles.titleContainer}>
              <Text style={[styles.title, large && styles.titleLarge]} numberOfLines={1}>
                {title}
              </Text>
              {subtitle && (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>

            {rightComponent ? (
              rightComponent
            ) : rightIcon ? (
              <TouchableOpacity
                style={styles.rightButton}
                onPress={onRightPress}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Icon name={rightIcon} size={24} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <View style={styles.spacer} />
            )}
          </View>
          {children && (
            <View style={styles.childrenContainer}>
              {children}
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

// Predefined gradient presets for different screens
export const HeaderGradients = {
  primary: ['#3B82F6', '#2563EB'],      // Blue - Default
  attendance: ['#F59E0B', '#EA580C'],   // Orange
  leave: ['#EC4899', '#DB2777'],        // Pink
  payroll: ['#10B981', '#059669'],      // Green
  timesheet: ['#6366F1', '#4F46E5'],    // Indigo
  profile: ['#8B5CF6', '#7C3AED'],      // Purple
  notifications: ['#F43F5E', '#E11D48'], // Rose
  calendar: ['#06B6D4', '#0891B2'],     // Cyan
  settings: ['#64748B', '#475569'],     // Slate
};

const styles = StyleSheet.create({
  header: {
    paddingBottom: Spacing.md,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerLarge: {
    paddingBottom: Spacing.xl,
  },
  headerWithChildren: {
    paddingBottom: Spacing.xl,
  },
  childrenContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  safeArea: {
    width: '100%',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    minHeight: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  titleLarge: {
    fontSize: 24,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    textAlign: 'center',
  },
  spacer: {
    width: 40,
  },
});
