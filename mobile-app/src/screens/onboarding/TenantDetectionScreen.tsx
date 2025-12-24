import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useAuthStore} from '../../store/authStore';
import {authApi} from '../../api/authApi';
import {handleApiError} from '../../api/apiClient';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import type {RootStackParamList} from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TenantDetectionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const setTenant = useAuthStore(state => state.setTenant);
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const [companyCode, setCompanyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!companyCode.trim()) {
      setError('Please enter your company code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authApi.getTenantBySlug(companyCode.toLowerCase().trim());

      if (response.success && response.data) {
        setTenant(response.data);
        navigation.navigate('Login');
      } else {
        setError('Company not found. Please check the code and try again.');
      }
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, {color: colors.text}]}>
              Enter Company Code
            </Text>
            <Text style={[styles.subtitle, {color: colors.textSecondary}]}>
              Enter your organization's unique code to continue. You can find this
              in your welcome email or ask your HR administrator.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, {color: colors.text}]}>Company Code</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: error ? colors.error : colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="e.g., acme-corp"
                placeholderTextColor={colors.textDisabled}
                value={companyCode}
                onChangeText={text => {
                  setCompanyCode(text);
                  setError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {error ? (
                <Text style={[styles.errorText, {color: colors.error}]}>{error}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                {backgroundColor: colors.primary},
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleContinue}
              disabled={isLoading}
              activeOpacity={0.8}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, {color: colors.textSecondary}]}>
              Don't have a company code?
            </Text>
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'Contact Support',
                  'Please contact your HR administrator or reach out to support@hrm.com for assistance.'
                )
              }>
              <Text style={[styles.linkText, {color: colors.primary}]}>
                Get Help
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    lineHeight: 22,
  },
  form: {
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.lg,
  },
  errorText: {
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs,
  },
  button: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: FontSizes.md,
    marginRight: Spacing.xs,
  },
  linkText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
