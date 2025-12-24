import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAuthStore} from '../../store/authStore';
import {authApi} from '../../api/authApi';
import {handleApiError} from '../../api/apiClient';
import {authStorage} from '../../services/authStorage';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import type {RootStackParamList, User} from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {tenant, login} = useAuthStore();
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string; general?: string}>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      console.log('[Login] Attempting login for:', email.trim().toLowerCase());
      console.log('[Login] Tenant ID:', tenant?._id);

      const response = await authApi.login({
        email: email.trim().toLowerCase(),
        password,
        tenantId: tenant?._id,
      });

      console.log('[Login] Raw response:', JSON.stringify(response, null, 2));

      // API returns user, accessToken, refreshToken at root level (not in data wrapper)
      const loginResponse = response as unknown as {
        success: boolean;
        user: User;
        accessToken: string;
        refreshToken: string;
        message?: string;
      };

      console.log('[Login] Parsed response - success:', loginResponse.success);
      console.log('[Login] Parsed response - has user:', !!loginResponse.user);
      console.log('[Login] Parsed response - has accessToken:', !!loginResponse.accessToken);

      if (loginResponse.success && loginResponse.user) {
        const tokens = {
          accessToken: loginResponse.accessToken,
          refreshToken: loginResponse.refreshToken,
        };

        console.log('[Login] Login successful, storing tokens...');
        console.log('[Login] Access token preview:', tokens.accessToken?.substring(0, 30) + '...');

        // Store tokens securely
        const stored = await authStorage.setTokens(tokens);
        console.log('[Login] Tokens stored in Keychain:', stored);

        // Update auth state
        login(loginResponse.user, tokens, tenant!);
        console.log('[Login] Auth state updated in Zustand store');

        // Verify tokens are in store
        const verifyStore = useAuthStore.getState();
        console.log('[Login] Verification - Store has tokens:', !!verifyStore.tokens?.accessToken);
        console.log('[Login] Verification - Store isAuthenticated:', verifyStore.isAuthenticated);

        // Navigation will happen automatically via RootNavigator
      } else {
        setErrors({general: loginResponse.message || 'Login failed'});
      }
    } catch (err) {
      const errorMessage = handleApiError(err);
      setErrors({general: errorMessage});
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeTenant = () => {
    navigation.navigate('TenantDetection');
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            {/* Tenant Info */}
            <TouchableOpacity
              style={[styles.tenantCard, {backgroundColor: colors.surface}]}
              onPress={handleChangeTenant}>
              <View style={styles.tenantInfo}>
                <View style={[styles.tenantLogo, {backgroundColor: colors.primary}]}>
                  <Text style={styles.tenantLogoText}>
                    {tenant?.name.charAt(0).toUpperCase() || 'C'}
                  </Text>
                </View>
                <View style={styles.tenantText}>
                  <Text style={[styles.tenantName, {color: colors.text}]}>
                    {tenant?.name || 'Company'}
                  </Text>
                  <Text style={[styles.tenantSlug, {color: colors.textSecondary}]}>
                    {tenant?.slug || 'company-code'}
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Login Form */}
            <View style={styles.form}>
              <Text style={[styles.title, {color: colors.text}]}>Sign In</Text>
              <Text style={[styles.subtitle, {color: colors.textSecondary}]}>
                Enter your credentials to continue
              </Text>

              {errors.general && (
                <View style={[styles.errorBanner, {backgroundColor: colors.errorLight}]}>
                  <Icon name="alert-circle" size={20} color={colors.error} />
                  <Text style={[styles.errorBannerText, {color: colors.error}]}>
                    {errors.general}
                  </Text>
                </View>
              )}

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, {color: colors.text}]}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Icon
                    name="email-outline"
                    size={20}
                    color={colors.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        borderColor: errors.email ? colors.error : colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.textDisabled}
                    value={email}
                    onChangeText={text => {
                      setEmail(text);
                      setErrors(prev => ({...prev, email: undefined}));
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                </View>
                {errors.email && (
                  <Text style={[styles.errorText, {color: colors.error}]}>{errors.email}</Text>
                )}
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, {color: colors.text}]}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Icon
                    name="lock-outline"
                    size={20}
                    color={colors.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        borderColor: errors.password ? colors.error : colors.border,
                        color: colors.text,
                        paddingRight: 50,
                      },
                    ]}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.textDisabled}
                    value={password}
                    onChangeText={text => {
                      setPassword(text);
                      setErrors(prev => ({...prev, password: undefined}));
                    }}
                    secureTextEntry={!showPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}>
                    <Icon
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && (
                  <Text style={[styles.errorText, {color: colors.error}]}>{errors.password}</Text>
                )}
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[
                  styles.button,
                  {backgroundColor: colors.primary},
                  isLoading && styles.buttonDisabled,
                ]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.8}>
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </TouchableOpacity>

              {/* Forgot Password */}
              <TouchableOpacity style={styles.forgotButton}>
                <Text style={[styles.forgotText, {color: colors.primary}]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  tenantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  tenantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tenantLogo: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  tenantLogoText: {
    color: '#FFFFFF',
    fontSize: FontSizes.xl,
    fontWeight: '700',
  },
  tenantText: {
    flex: 1,
  },
  tenantName: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  tenantSlug: {
    fontSize: FontSizes.sm,
  },
  form: {
    flex: 1,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    marginBottom: Spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  errorBannerText: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: FontSizes.md,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: Spacing.md,
    top: '50%',
    transform: [{translateY: -10}],
    zIndex: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingLeft: 44,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.lg,
  },
  eyeButton: {
    position: 'absolute',
    right: Spacing.md,
    top: '50%',
    transform: [{translateY: -10}],
  },
  errorText: {
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs,
  },
  button: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  forgotText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
