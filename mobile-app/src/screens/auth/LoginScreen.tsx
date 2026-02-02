import React, {useState, useEffect, useRef} from 'react';
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
  Modal,
  Animated,
  Easing,
  Linking,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useAuthStore} from '../../store/authStore';
import {authApi} from '../../api/authApi';
import {employeeApi} from '../../api/employeeApi';
import {handleApiError} from '../../api/apiClient';
import {authStorage} from '../../services/authStorage';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import type {RootStackParamList, User, Employee} from '../../types';
import {networkService, NetworkStatus} from '../../services/networkService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {tenant, login} = useAuthStore();
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const [mobileNumber, setMobileNumber] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{mobileNumber?: string; pin?: string; general?: string}>({});

  // Network status
  const [isOnline, setIsOnline] = useState<boolean>(networkService.isOnline());
  const [showOfflineModal, setShowOfflineModal] = useState(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const waveAnim1 = useRef(new Animated.Value(0)).current;
  const waveAnim2 = useRef(new Animated.Value(0)).current;
  const waveAnim3 = useRef(new Animated.Value(0)).current;

  // Subscribe to network status changes
  useEffect(() => {
    const unsubscribe = networkService.subscribe((status: NetworkStatus) => {
      const online = status.isConnected && status.isInternetReachable === true;
      setIsOnline(online);
      if (online && showOfflineModal) {
        setShowOfflineModal(false);
      }
    });

    return () => unsubscribe();
  }, [showOfflineModal]);

  // Start animations when modal is shown
  useEffect(() => {
    if (showOfflineModal) {
      // Reset animations
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      pulseAnim.setValue(1);

      // Fade in and slide up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse animation for icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();

      // Wave animations
      const createWaveAnimation = (anim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        );
      };

      createWaveAnimation(waveAnim1, 0).start();
      createWaveAnimation(waveAnim2, 400).start();
      createWaveAnimation(waveAnim3, 800).start();
    }
  }, [showOfflineModal]);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile number is required';
    } else if (!/^\d{10}$/.test(mobileNumber.trim())) {
      newErrors.mobileNumber = 'Please enter a valid 10-digit mobile number';
    }

    if (!pin) {
      newErrors.pin = 'PIN is required';
    } else if (!/^\d{4}$/.test(pin)) {
      newErrors.pin = 'PIN must be 4 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    // Check network status first
    if (!networkService.isOnline()) {
      setShowOfflineModal(true);
      return;
    }

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      console.log('[Login] Attempting login for mobile:', mobileNumber.trim());
      console.log('[Login] Tenant ID:', tenant?._id);

      const response = await authApi.loginWithMobile({
        mobileNumber: mobileNumber.trim(),
        pin,
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

        // Fetch employee data if employeeId exists
        let employeeData: Employee | undefined;
        const employeeId = loginResponse.user.employeeId;
        if (employeeId) {
          console.log('[Login] Fetching employee data for ID:', employeeId);
          try {
            const employeeResponse = await employeeApi.getEmployeeDetails(employeeId);
            if (employeeResponse.success && employeeResponse.data) {
              employeeData = employeeResponse.data as Employee;
              console.log('[Login] Employee data fetched:', employeeData._id);
            }
          } catch (empErr) {
            console.warn('[Login] Failed to fetch employee data:', empErr);
          }
        } else {
          console.log('[Login] No employeeId in user object, skipping employee fetch');
        }

        // Update auth state with employee data
        login(loginResponse.user, tokens, tenant!, employeeData);
        console.log('[Login] Auth state updated in Zustand store with employee:', !!employeeData);

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

  const handleOpenSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const handleRetryConnection = () => {
    if (networkService.isOnline()) {
      setShowOfflineModal(false);
    }
  };

  // Render wave circle
  const renderWave = (anim: Animated.Value, delay: number) => {
    const scale = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2.5],
    });
    const opacity = anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.6, 0.3, 0],
    });

    return (
      <Animated.View
        style={[
          styles.waveCircle,
          {
            transform: [{scale}],
            opacity,
          },
        ]}
      />
    );
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
            {/* Offline Status Banner */}
            {!isOnline && (
              <TouchableOpacity
                style={styles.offlineBanner}
                onPress={() => setShowOfflineModal(true)}
                activeOpacity={0.8}>
                <Icon name="wifi-off" size={18} color="#FFFFFF" />
                <Text style={styles.offlineBannerText}>
                  No internet connection
                </Text>
                <Icon name="chevron-right" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}

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

              {/* Mobile Number Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, {color: colors.text}]}>Mobile Number</Text>
                <View style={styles.inputWrapper}>
                  <Icon
                    name="cellphone"
                    size={20}
                    color={colors.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        borderColor: errors.mobileNumber ? colors.error : colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholder="Enter your mobile number"
                    placeholderTextColor={colors.textDisabled}
                    value={mobileNumber}
                    onChangeText={text => {
                      const numericText = text.replace(/[^0-9]/g, '').slice(0, 10);
                      setMobileNumber(numericText);
                      setErrors(prev => ({...prev, mobileNumber: undefined}));
                    }}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={10}
                    editable={!isLoading}
                  />
                </View>
                {errors.mobileNumber && (
                  <Text style={[styles.errorText, {color: colors.error}]}>{errors.mobileNumber}</Text>
                )}
              </View>

              {/* PIN Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, {color: colors.text}]}>PIN</Text>
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
                        borderColor: errors.pin ? colors.error : colors.border,
                        color: colors.text,
                        paddingRight: 50,
                        letterSpacing: 8,
                        fontSize: 20,
                      },
                    ]}
                    placeholder="Enter 4-digit PIN (e.g. 1122)"
                    placeholderTextColor={colors.textDisabled}
                    value={pin}
                    onChangeText={text => {
                      const numericText = text.replace(/[^0-9]/g, '').slice(0, 4);
                      setPin(numericText);
                      setErrors(prev => ({...prev, pin: undefined}));
                    }}
                    secureTextEntry={!showPin}
                    keyboardType="number-pad"
                    maxLength={4}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPin(!showPin)}>
                    <Icon
                      name={showPin ? 'eye-off' : 'eye'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                {errors.pin && (
                  <Text style={[styles.errorText, {color: colors.error}]}>{errors.pin}</Text>
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

              {/* Forgot PIN */}
              <TouchableOpacity style={styles.forgotButton}>
                <Text style={[styles.forgotText, {color: colors.primary}]}>
                  Forgot PIN?
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* No Internet Connection Modal */}
      <Modal
        visible={showOfflineModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowOfflineModal(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              {backgroundColor: colors.surface},
              {
                opacity: fadeAnim,
                transform: [{translateY: slideAnim}],
              },
            ]}>
            {/* Animated Icon with Waves */}
            <View style={styles.iconContainer}>
              {renderWave(waveAnim1, 0)}
              {renderWave(waveAnim2, 400)}
              {renderWave(waveAnim3, 800)}
              <Animated.View
                style={[
                  styles.iconCircle,
                  {transform: [{scale: pulseAnim}]},
                ]}>
                <Icon name="wifi-off" size={48} color="#FFFFFF" />
              </Animated.View>
            </View>

            {/* Title */}
            <Text style={[styles.modalTitle, {color: colors.text}]}>
              No Internet Connection
            </Text>

            {/* Description */}
            <Text style={[styles.modalDescription, {color: colors.textSecondary}]}>
              Please check your mobile data or Wi-Fi connection and try again.
            </Text>

            {/* Connection Status */}
            <View style={[styles.statusCard, {backgroundColor: colors.errorLight}]}>
              <View style={styles.statusRow}>
                <Icon name="signal-off" size={20} color={colors.error} />
                <Text style={[styles.statusText, {color: colors.error}]}>
                  Mobile Data: Off
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Icon name="wifi-off" size={20} color={colors.error} />
                <Text style={[styles.statusText, {color: colors.error}]}>
                  Wi-Fi: Not Connected
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.settingsButton]}
                onPress={handleOpenSettings}
                activeOpacity={0.8}>
                <Icon name="cog" size={20} color={colors.primary} />
                <Text style={[styles.modalButtonText, {color: colors.primary}]}>
                  Open Settings
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.retryButton, {backgroundColor: colors.primary}]}
                onPress={handleRetryConnection}
                activeOpacity={0.8}>
                <Icon name="refresh" size={20} color="#FFFFFF" />
                <Text style={[styles.modalButtonText, {color: '#FFFFFF'}]}>
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowOfflineModal(false)}>
              <Text style={[styles.closeButtonText, {color: colors.textSecondary}]}>
                Dismiss
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  iconContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  waveCircle: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#EF4444',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  statusCard: {
    width: '100%',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  statusText: {
    fontSize: FontSizes.md,
    marginLeft: Spacing.sm,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  settingsButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
  },
  retryButton: {
    backgroundColor: '#3B82F6',
  },
  modalButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
  closeButtonText: {
    fontSize: FontSizes.md,
  },
  // Offline Banner at top
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  offlineBannerText: {
    color: '#FFFFFF',
    fontSize: FontSizes.sm,
    fontWeight: '600',
    flex: 1,
  },
});
