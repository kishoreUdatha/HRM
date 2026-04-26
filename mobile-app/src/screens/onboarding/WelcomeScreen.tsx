import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';

const HRZioLogo = require('../../assets/hrzio-logo.png');
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useAuthStore} from '../../store/authStore';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import type {RootStackParamList} from '../../types';

const {width} = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const setOnboarded = useAuthStore(state => state.setOnboarded);
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const handleGetStarted = () => {
    setOnboarded(true);
    navigation.navigate('TenantDetection');
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={HRZioLogo}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.title, {color: colors.text}]}>
            Welcome to HRZio
          </Text>
          <Text style={[styles.subtitle, {color: colors.textSecondary}]}>
            Manage your attendance, leave, timesheets, and payroll all in one place.
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          <FeatureItem
            icon="camera"
            title="Face Attendance"
            description="Check in with facial recognition"
            colors={colors}
          />
          <FeatureItem
            icon="calendar"
            title="Leave Management"
            description="Apply and track your leaves"
            colors={colors}
          />
          <FeatureItem
            icon="cash"
            title="Payslips"
            description="View and download your payslips"
            colors={colors}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, {backgroundColor: colors.primary}]}
          onPress={handleGetStarted}
          activeOpacity={0.8}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
  colors: typeof Colors.light;
}

function FeatureItem({icon, title, description, colors}: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, {backgroundColor: colors.primaryLight + '20'}]}>
        <Text style={[styles.featureIconText, {color: colors.primary}]}>
          {icon === 'camera' ? '📷' : icon === 'calendar' ? '📅' : '💰'}
        </Text>
      </View>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, {color: colors.text}]}>{title}</Text>
        <Text style={[styles.featureDescription, {color: colors.textSecondary}]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logo: {
    width: 150,
    height: 150,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSizes.lg,
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresContainer: {
    marginBottom: Spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  featureIconText: {
    fontSize: FontSizes.xl,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: FontSizes.md,
  },
  button: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
});
