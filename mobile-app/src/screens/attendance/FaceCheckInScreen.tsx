import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
  PermissionsAndroid,
  Animated,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Camera, useCameraDevice, useCameraPermission} from 'react-native-vision-camera';
import Geolocation from '@react-native-community/geolocation';
import RNFS from 'react-native-fs';
import {useQueryClient} from '@tanstack/react-query';

import {useAuthStore, useUser} from '../../store/authStore';
import {attendanceApi, VerifyFaceResponse, GeofencingConfig} from '../../api/attendanceApi';
import {handleApiError} from '../../api/apiClient';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import type {RootStackParamList} from '../../types';
import {showToast, showDialog, ALERT_TYPE} from '../../utils/alert';
import {isWithinGeofence, formatDistance, GeofenceResult} from '../../utils/geofencing';
import {
  livenessDetectionService,
  LivenessSession,
  LivenessChallenge as Challenge,
  LivenessProof,
} from '../../services/livenessDetectionService';
import {faceQualityService, FaceQualityResult} from '../../services/faceQualityService';
import LivenessChallenge from '../../components/LivenessChallenge';
import {networkService, NetworkStatus} from '../../services/networkService';
import {locationService, FullLocationData} from '../../services/locationService';
import {useOfflineQueueStore, usePendingPunchCount} from '../../store/offlineQueueStore';
import {syncService} from '../../services/syncService';
import {checkoutReminderService} from '../../services/checkoutReminderService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type VerificationState = 'liveness' | 'camera' | 'verifying' | 'matched' | 'confirming' | 'success' | 'error';

// Configuration - set to true to require liveness check before verification
const REQUIRE_LIVENESS_CHECK = false; // Can be made configurable via settings

export default function FaceCheckInScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const user = useUser();
  const queryClient = useQueryClient();
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const isCheckOut = route.name === 'FaceCheckOut';

  const camera = useRef<Camera>(null);
  const device = useCameraDevice('front');
  const {hasPermission, requestPermission} = useCameraPermission();

  const [verificationState, setVerificationState] = useState<VerificationState>(
    REQUIRE_LIVENESS_CHECK ? 'liveness' : 'camera'
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [matchedEmployee, setMatchedEmployee] = useState<{
    employeeId: string;
    employeeName: string;
    confidence: number;
  } | null>(null);
  const [location, setLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [fullLocation, setFullLocation] = useState<FullLocationData | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Offline mode state
  const [isOnline, setIsOnline] = useState<boolean>(networkService.isOnline());
  const [isLocationEnabled, setIsLocationEnabled] = useState<boolean>(true);
  const [isOfflineSuccess, setIsOfflineSuccess] = useState<boolean>(false);
  const pendingPunchCount = usePendingPunchCount();
  const addOfflinePunch = useOfflineQueueStore(state => state.addPunch);

  // Liveness state
  const [livenessSession, setLivenessSession] = useState<LivenessSession | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [challengeProgress, setChallengeProgress] = useState({
    currentChallenge: 0,
    totalChallenges: 0,
    passedChallenges: 0,
    isComplete: false,
  });
  const [livenessProof, setLivenessProof] = useState<LivenessProof | null>(null);
  const [challengeTimeRemaining, setChallengeTimeRemaining] = useState<number | undefined>();
  const [detectionState, setDetectionState] = useState({
    isBlinking: false,
    headPose: {yaw: 0, pitch: 0, roll: 0},
    mouthOpen: false,
  });

  // Animation for success state
  const successScale = useRef(new Animated.Value(0)).current;

  // Start liveness session if required
  useEffect(() => {
    if (REQUIRE_LIVENESS_CHECK) {
      startLivenessSession();
    }
  }, []);

  // Subscribe to network status changes
  useEffect(() => {
    const unsubscribe = networkService.subscribe((status: NetworkStatus) => {
      const online = status.isConnected && status.isInternetReachable === true;
      setIsOnline(online);
      console.log('[FaceCheckIn] Network status:', online ? 'Online' : 'Offline');
    });

    // Check location enabled on mount
    checkLocationEnabled();

    return () => unsubscribe();
  }, []);

  const checkLocationEnabled = async () => {
    const enabled = await locationService.isLocationEnabled();
    setIsLocationEnabled(enabled);
    console.log('[FaceCheckIn] Location enabled:', enabled);
  };

  // Challenge timer
  useEffect(() => {
    if (currentChallenge && verificationState === 'liveness') {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, currentChallenge.timeout - elapsed);
        setChallengeTimeRemaining(remaining);

        if (remaining === 0) {
          handleChallengeTimeout();
          clearInterval(interval);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [currentChallenge, verificationState]);

  // Simulate liveness detection (in real app, use frame processor)
  useEffect(() => {
    if (verificationState === 'liveness' && currentChallenge) {
      const simulationInterval = setInterval(() => {
        const randomEvent = Math.random();

        if (currentChallenge.type === 'blink' && randomEvent > 0.9) {
          setDetectionState(prev => ({...prev, isBlinking: true}));
          setTimeout(() => {
            setDetectionState(prev => ({...prev, isBlinking: false}));
            handleChallengeComplete(true, 0.9);
          }, 200);
        } else if (currentChallenge.type === 'head_turn_left') {
          setDetectionState(prev => ({
            ...prev,
            headPose: {...prev.headPose, yaw: prev.headPose.yaw - 2},
          }));
          if (detectionState.headPose.yaw <= -15) {
            handleChallengeComplete(true, 0.85);
          }
        } else if (currentChallenge.type === 'head_turn_right') {
          setDetectionState(prev => ({
            ...prev,
            headPose: {...prev.headPose, yaw: prev.headPose.yaw + 2},
          }));
          if (detectionState.headPose.yaw >= 15) {
            handleChallengeComplete(true, 0.85);
          }
        }
      }, 500);

      return () => clearInterval(simulationInterval);
    }
  }, [verificationState, currentChallenge, detectionState.headPose.yaw]);

  const startLivenessSession = () => {
    const session = livenessDetectionService.startSession(2);
    setLivenessSession(session);
    setCurrentChallenge(livenessDetectionService.getCurrentChallenge());
    updateChallengeProgress();
    setVerificationState('liveness');
    setDetectionState({
      isBlinking: false,
      headPose: {yaw: 0, pitch: 0, roll: 0},
      mouthOpen: false,
    });
  };

  const updateChallengeProgress = () => {
    setChallengeProgress(livenessDetectionService.getSessionProgress());
  };

  const handleChallengeComplete = (passed: boolean, confidence: number) => {
    livenessDetectionService.recordChallengeResult(passed, confidence);
    updateChallengeProgress();

    const nextChallenge = livenessDetectionService.getCurrentChallenge();
    if (nextChallenge) {
      setCurrentChallenge(nextChallenge);
      setChallengeTimeRemaining(nextChallenge.timeout);
      setDetectionState({
        isBlinking: false,
        headPose: {yaw: 0, pitch: 0, roll: 0},
        mouthOpen: false,
      });
    } else {
      const proof = livenessDetectionService.completeSession();
      setLivenessProof(proof);

      if (proof && livenessDetectionService.getSessionProgress().passedChallenges >= 2) {
        showToast.success('Liveness verified!');
        setTimeout(() => setVerificationState('camera'), 500);
      } else {
        showDialog.error('Liveness Check Failed', 'Please try again.', () => {
          startLivenessSession();
        });
      }
    }
  };

  const handleChallengeTimeout = () => {
    livenessDetectionService.recordChallengeResult(false, 0);
    updateChallengeProgress();

    const nextChallenge = livenessDetectionService.getCurrentChallenge();
    if (nextChallenge) {
      setCurrentChallenge(nextChallenge);
      setChallengeTimeRemaining(nextChallenge.timeout);
      showToast.warning('Challenge timed out. Try the next one.');
    } else {
      const proof = livenessDetectionService.completeSession();
      setLivenessProof(proof);

      if (proof && livenessDetectionService.getSessionProgress().passedChallenges >= 2) {
        setVerificationState('camera');
      } else {
        showDialog.error('Liveness Check Failed', 'Please try again.', () => {
          startLivenessSession();
        });
      }
    }
  };

  const handleSkipLiveness = () => {
    setLivenessProof(null);
    setVerificationState('camera');
  };

  // Set StatusBar for camera screen
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content');
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }, [])
  );

  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location for attendance check-in.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    // iOS
    return new Promise((resolve) => {
      Geolocation.requestAuthorization();
      setTimeout(() => resolve(true), 1000);
    });
  };

  const getCurrentLocation = (): Promise<{latitude: number; longitude: number}> => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          Geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
            },
            (err) => {
              reject(err);
            },
            {enableHighAccuracy: true, timeout: 30000, maximumAge: 60000}
          );
        },
        {enableHighAccuracy: false, timeout: 10000, maximumAge: 60000}
      );
    });
  };

  const openLocationSettings = () => {
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => {
        Linking.openSettings();
      });
    } else {
      Linking.openSettings();
    }
  };

  const handleCapture = useCallback(async () => {
    if (!camera.current) return;

    setIsCapturing(true);
    setLocationError(null);

    try {
      // Take photo FIRST while camera is still active
      const photo = await camera.current.takePhoto({
        qualityPrioritization: 'quality',
      });

      // Now set verifying state after photo is captured
      setVerificationState('verifying');

      // Request location permission
      const hasLocationPermission = await requestLocationPermission();
      if (!hasLocationPermission) {
        showDialog.warning('Location Required', 'Please enable location access to check in.', () => {
          Linking.openSettings();
        });
        setIsCapturing(false);
        setVerificationState('camera');
        return;
      }

      // Get full location with address using location service
      let currentLocation: FullLocationData;
      try {
        currentLocation = await locationService.getFullLocation();
        setLocation({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        });
        setFullLocation(currentLocation);
        console.log('[FaceCheckIn] Got location:', currentLocation);
      } catch (locError: any) {
        console.error('[FaceCheckIn] Location error:', locError);
        const errorCode = locError?.code;
        if (errorCode === 2 || locError?.message?.includes('disabled')) {
          setLocationError('GPS is turned off.');
          setIsLocationEnabled(false);
          showDialog.warning('Turn On Location', 'GPS is required for attendance check-in.', () => {
            locationService.openLocationSettings();
          });
        } else if (locError?.message?.includes('permission')) {
          setLocationError('Location permission denied.');
          showDialog.warning('Location Permission', 'Please enable location access to check in.', () => {
            Linking.openSettings();
          });
        } else {
          setLocationError('Could not get your location.');
        }
        setIsCapturing(false);
        setVerificationState('camera');
        return;
      }

      // Check geo-fencing
      try {
        const geofencingResponse = await attendanceApi.getGeofencingConfig();
        if (geofencingResponse.success && geofencingResponse.data?.enabled) {
          const geofenceConfig = geofencingResponse.data;

          if (geofenceConfig.locations && geofenceConfig.locations.length > 0) {
            const geofenceResult = isWithinGeofence(
              currentLocation,
              geofenceConfig.locations,
              geofenceConfig.defaultRadius
            );

            console.log('[FaceCheckIn] Geo-fence validation:', geofenceResult);

            if (!geofenceResult.isWithin) {
              if (geofenceConfig.strictMode) {
                // Strict mode: Block check-in
                const message = `You are ${formatDistance(geofenceResult.distanceMeters)} away from ${geofenceResult.nearestOffice || 'the office'}.\n\nAllowed radius: ${formatDistance(geofenceResult.allowedRadius)}.\n\nPlease move closer to your office to check in.`;
                showDialog.error('Outside Work Location', message, () => {
                  setVerificationState('camera');
                });
                setIsCapturing(false);
                return;
              } else {
                // Non-strict mode: Show warning but allow
                showToast.warning(`You are ${formatDistance(geofenceResult.distanceMeters)} away from ${geofenceResult.nearestOffice || 'the office'}. Check-in will be recorded with a location warning.`);
              }
            }
          }
        }
      } catch (geoError) {
        console.log('[FaceCheckIn] Could not fetch geofencing config:', geoError);
        // Continue without geo-fence validation if config fetch fails
      }

      // Read image and convert to base64
      let base64Image = '';
      try {
        base64Image = await RNFS.readFile(photo.path, 'base64');
        base64Image = `data:image/jpeg;base64,${base64Image}`;
      } catch (err) {
        console.error('[FaceCheckIn] Error reading image:', err);
        // Fallback to path reference
        base64Image = `captured:${Date.now()}:${photo.path.split('/').pop()}`;
      }

      // Use employeeId from user object (set during mobile login)
      // Get fresh user from store to avoid stale closure
      const currentUser = useAuthStore.getState().user;
      const employeeId = currentUser?.employeeId || currentUser?._id;
      const tenantId = currentUser?.tenantId || '';
      const employeeName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim();
      console.log('[FaceCheckIn] User object:', JSON.stringify(currentUser));
      console.log('[FaceCheckIn] Calling verify-face API with employeeId:', employeeId);
      console.log('[FaceCheckIn] Network status - isOnline:', networkService.isOnline());

      // Check if offline - save to queue instead of API call
      if (!networkService.isOnline()) {
        console.log('[FaceCheckIn] Offline mode - saving punch to queue');
        await saveOfflinePunch(
          tenantId,
          employeeId!,
          employeeName,
          currentLocation,
          0.9 // Default confidence for offline mode
        );
        return;
      }

      // Online - Call verify-face API
      try {
        const verifyResponse = await attendanceApi.verifyFace({
          faceImage: base64Image,
          location: {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          },
          employeeId: employeeId, // Send logged-in employee ID as hint for mock mode
        });

        console.log('[FaceCheckIn] Verify response:', verifyResponse);

        if (verifyResponse.success && verifyResponse.status === 'MATCHED') {
          // Face matched - show personalized greeting
          setMatchedEmployee({
            employeeId: verifyResponse.employeeId!,
            employeeName: verifyResponse.employeeName!,
            confidence: verifyResponse.confidence || 0.9,
          });
          setVerificationState('matched');
        } else {
          // Face not matched or error
          setVerificationState('error');
          let errorMessage = verifyResponse.message;

          if (verifyResponse.status === 'NO_FACE') {
            errorMessage = 'No face detected. Please position your face in the frame.';
          } else if (verifyResponse.status === 'MULTIPLE_FACES') {
            errorMessage = 'Multiple faces detected. Please ensure only one person is in the frame.';
          } else if (verifyResponse.status === 'NO_ENROLLMENTS') {
            errorMessage = 'Your face is not enrolled yet.';
            showDialog.info('Face Not Enrolled', errorMessage, () => {
              navigation.replace('FaceEnrollment');
            });
            return;
          } else if (verifyResponse.status === 'NO_MATCH') {
            errorMessage = 'Face not recognized. Please try again or contact HR.';
          }

          showDialog.error('Verification Failed', errorMessage, () => setVerificationState('camera'));
        }
      } catch (apiError) {
        // API call failed - fallback to offline mode
        console.error('[FaceCheckIn] API error, falling back to offline mode:', apiError);
        showToast.warning('Network issue - saving punch offline');
        await saveOfflinePunch(
          tenantId,
          employeeId!,
          employeeName,
          currentLocation,
          0.9 // Default confidence for offline mode
        );
      }
    } catch (error) {
      console.error('[FaceCheckIn] Error:', error);
      const errorMessage = handleApiError(error);
      setVerificationState('error');
      showDialog.error('Error', errorMessage, () => setVerificationState('camera'));
    } finally {
      setIsCapturing(false);
    }
  }, [user, navigation]);

  // Save punch to offline queue
  const saveOfflinePunch = async (
    tenantId: string,
    employeeId: string,
    employeeName: string,
    locationData: FullLocationData,
    confidence: number
  ) => {
    const punchId = addOfflinePunch({
      tenantId,
      employeeId,
      employeeName,
      type: isCheckOut ? 'check-out' : 'check-in',
      timestamp: new Date().toISOString(),
      location: {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        address: locationData.address?.formattedAddress,
        accuracy: locationData.accuracy,
      },
      faceVerification: {
        verified: true,
        confidence,
      },
    });

    console.log('[FaceCheckIn] Saved offline punch:', punchId);

    // Show offline success
    setIsOfflineSuccess(true);
    setSuccessMessage(
      isCheckOut
        ? `Your check-out has been saved offline. It will sync automatically when you're back online.`
        : `Your check-in has been saved offline. It will sync automatically when you're back online.`
    );
    setVerificationState('success');

    // Animate success icon
    Animated.spring(successScale, {
      toValue: 1,
      friction: 4,
      tension: 100,
      useNativeDriver: true,
    }).start();

    // Auto-close after 3 seconds
    setTimeout(() => {
      navigation.goBack();
    }, 3000);
  };

  const handleConfirmCheckIn = async () => {
    if (!matchedEmployee || !location) return;

    setVerificationState('confirming');

    try {
      const confirmApi = isCheckOut
        ? attendanceApi.confirmCheckOut
        : attendanceApi.confirmCheckIn;

      const response = await confirmApi({
        employeeId: matchedEmployee.employeeId,
        confidence: matchedEmployee.confidence,
        location,
      });

      if (response.success) {
        setSuccessMessage(response.message || (isCheckOut
          ? `Goodbye, ${matchedEmployee.employeeName.split(' ')[0]}! See you tomorrow!`
          : `Thank you, ${matchedEmployee.employeeName.split(' ')[0]}! Have a productive day!`));
        setVerificationState('success');

        // Handle checkout reminder
        if (isCheckOut) {
          // Cancel any pending checkout reminder on check-out
          checkoutReminderService.cancelReminder().catch(err => {
            console.log('[FaceCheckIn] Error cancelling checkout reminder:', err);
          });
        } else {
          // Schedule checkout reminder on successful check-in
          scheduleCheckoutReminder(matchedEmployee.employeeName);
        }

        // Invalidate attendance queries to refresh data immediately
        queryClient.invalidateQueries({queryKey: ['todayAttendance']});
        queryClient.invalidateQueries({queryKey: ['attendanceSummary']});
        queryClient.invalidateQueries({queryKey: ['attendanceRecords']});
        queryClient.invalidateQueries({queryKey: ['attendance']});

        // Animate success icon
        Animated.spring(successScale, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }).start();

        // Auto-close after 3 seconds
        setTimeout(() => {
          navigation.goBack();
        }, 3000);
      } else {
        showDialog.error('Error', response.message || 'Check-in failed', () => setVerificationState('camera'));
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      showDialog.error('Error', errorMessage, () => setVerificationState('camera'));
    }
  };

  // Schedule checkout reminder after successful check-in
  const scheduleCheckoutReminder = async (employeeName: string) => {
    try {
      // Fetch notification settings and shift config
      const [notificationSettingsRes, shiftConfigRes] = await Promise.all([
        attendanceApi.getNotificationSettings().catch(() => null),
        attendanceApi.getShiftConfig().catch(() => null),
      ]);

      const notificationSettings = notificationSettingsRes?.data;
      const shiftConfig = shiftConfigRes?.data;

      // Check if checkout reminder is enabled
      if (notificationSettings && !notificationSettings.enableCheckoutReminder) {
        console.log('[FaceCheckIn] Checkout reminder disabled for tenant');
        return;
      }

      // Get shift end time (default to 18:00 if not configured)
      const shiftEndTime = shiftConfig?.endTime || '18:00';
      const checkoutReminderThreshold = notificationSettings?.checkoutReminderThreshold || 30;

      console.log('[FaceCheckIn] Scheduling checkout reminder:', {
        shiftEndTime,
        checkoutReminderThreshold,
        employeeName,
      });

      await checkoutReminderService.scheduleReminder({
        employeeName,
        shiftEndTime,
        checkoutReminderThreshold,
      });
    } catch (error) {
      console.error('[FaceCheckIn] Error scheduling checkout reminder:', error);
      // Don't show error to user - checkout reminder is not critical
    }
  };

  const handleRetry = () => {
    setMatchedEmployee(null);
    setVerificationState('camera');
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (!granted) {
      showDialog.warning('Camera Permission Required', 'Please enable camera access in your device settings to use face check-in.', () => {
        Linking.openSettings();
      });
    }
  };

  // Render permission request screen
  if (!hasPermission) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
        <View style={styles.permissionContainer}>
          <Icon name="camera-off" size={64} color={colors.textSecondary} />
          <Text style={[styles.permissionTitle, {color: colors.text}]}>
            Camera Access Required
          </Text>
          <Text style={[styles.permissionText, {color: colors.textSecondary}]}>
            We need access to your camera to verify your identity for attendance.
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, {backgroundColor: colors.primary}]}
            onPress={handleRequestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}>
            <Text style={[styles.cancelButtonText, {color: colors.textSecondary}]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render no camera device screen
  if (!device) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
        <View style={styles.permissionContainer}>
          <Icon name="camera-off" size={64} color={colors.error} />
          <Text style={[styles.permissionTitle, {color: colors.text}]}>
            Camera Not Available
          </Text>
          <Text style={[styles.permissionText, {color: colors.textSecondary}]}>
            No front camera found on this device.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render success screen
  if (verificationState === 'success') {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: isOfflineSuccess ? '#F59E0B' : colors.success}]}>
        <View style={styles.successContainer}>
          <Animated.View style={[styles.successIcon, {transform: [{scale: successScale}]}]}>
            <Icon name={isOfflineSuccess ? 'cloud-check' : 'check-circle'} size={100} color="#FFFFFF" />
          </Animated.View>
          <Text style={styles.successTitle}>
            {isOfflineSuccess
              ? 'Saved Offline!'
              : isCheckOut ? 'Checked Out!' : 'Checked In!'}
          </Text>
          <Text style={styles.successMessage}>{successMessage}</Text>
          <Text style={styles.successTime}>
            {new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {isOfflineSuccess && (
            <View style={styles.offlineSuccessBadge}>
              <Icon name="sync" size={16} color="#FFFFFF" />
              <Text style={styles.offlineSuccessBadgeText}>Will sync when online</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Render matched employee confirmation screen
  if (verificationState === 'matched' && matchedEmployee) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.primary}]}>
        <View style={styles.matchedContainer}>
          <TouchableOpacity
            style={styles.closeButtonTop}
            onPress={() => navigation.goBack()}>
            <Icon name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.greetingContainer}>
            <Icon name="hand-wave" size={48} color="#FFFFFF" />
            <Text style={styles.greetingText}>
              Hi, {matchedEmployee.employeeName.split(' ')[0]}!
            </Text>
            <Text style={styles.greetingSubtext}>
              {matchedEmployee.employeeName}
            </Text>
            <View style={styles.confidenceBadge}>
              <Icon name="shield-check" size={16} color="#FFFFFF" />
              <Text style={styles.confidenceText}>
                {Math.round(matchedEmployee.confidence * 100)}% Match
              </Text>
            </View>
          </View>

          <View style={styles.confirmationBox}>
            <Text style={styles.confirmationTitle}>
              {isCheckOut ? 'Confirm Check-Out' : 'Confirm Check-In'}
            </Text>
            <Text style={styles.confirmationTime}>
              {new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <Text style={styles.confirmationDate}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.confirmButton, verificationState === 'confirming' && styles.buttonDisabled]}
              onPress={handleConfirmCheckIn}
              disabled={verificationState === 'confirming'}>
              {verificationState === 'confirming' ? (
                <ActivityIndicator color="#3B82F6" />
              ) : (
                <>
                  <Icon name="check" size={24} color="#3B82F6" />
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              disabled={verificationState === 'confirming'}>
              <Icon name="refresh" size={24} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Render camera screen (default)
  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={verificationState === 'camera' || verificationState === 'verifying'}
        photo={true}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Header */}
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => navigation.goBack()}>
              <Icon name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {isCheckOut ? 'Face Check Out' : 'Face Check In'}
            </Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>

        {/* Face Guide */}
        <View style={styles.faceGuide}>
          <View style={[
            styles.faceFrame,
            verificationState === 'liveness' && challengeProgress.isComplete && styles.faceFrameSuccess,
          ]}>
            {verificationState === 'verifying' && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.processingText}>Verifying...</Text>
              </View>
            )}
          </View>

          {/* Liveness Challenge UI */}
          {verificationState === 'liveness' && currentChallenge && (
            <LivenessChallenge
              challenge={currentChallenge}
              progress={challengeProgress}
              detectionState={detectionState}
              timeRemaining={challengeTimeRemaining}
              isDarkMode={isDarkMode}
            />
          )}

          {/* Normal guide text */}
          {verificationState !== 'liveness' && (
            <Text style={styles.guideText}>
              Position your face within the frame
            </Text>
          )}
        </View>

        {/* Status Banners */}
        <View style={styles.statusBannersContainer}>
          {/* Offline Banner */}
          {!isOnline && (
            <View style={[styles.statusBanner, styles.offlineBanner]}>
              <Icon name="wifi-off" size={18} color="#FFFFFF" />
              <Text style={styles.statusBannerText}>You are offline - punch will be saved locally</Text>
            </View>
          )}

          {/* Location Disabled Banner */}
          {!isLocationEnabled && (
            <TouchableOpacity
              style={[styles.statusBanner, styles.locationBanner]}
              onPress={() => locationService.openLocationSettings()}>
              <Icon name="crosshairs-gps" size={18} color="#FFFFFF" />
              <Text style={styles.statusBannerText}>Location is disabled - tap to enable</Text>
            </TouchableOpacity>
          )}

          {/* Pending Sync Badge */}
          {pendingPunchCount > 0 && (
            <View style={[styles.statusBanner, styles.pendingBanner]}>
              <Icon name="cloud-sync" size={18} color="#FFFFFF" />
              <Text style={styles.statusBannerText}>
                {pendingPunchCount} punch{pendingPunchCount > 1 ? 'es' : ''} pending sync
              </Text>
            </View>
          )}

          {/* Location Error */}
          {locationError && (
            <View style={[styles.statusBanner, styles.errorBannerNew]}>
              <Icon name="map-marker-alert" size={18} color="#FFFFFF" />
              <Text style={styles.statusBannerText}>{locationError}</Text>
            </View>
          )}
        </View>

        {/* Capture Button */}
        <SafeAreaView edges={['bottom']} style={styles.bottomContainer}>
          {verificationState === 'liveness' ? (
            <>
              <Text style={styles.captureHint}>
                Complete the liveness challenges above
              </Text>
              {/* Skip button for testing - remove in production */}
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkipLiveness}>
                <Text style={styles.skipButtonText}>Skip (Dev Only)</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Icon name="account" size={20} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.infoText}>
                    {user?.firstName} {user?.lastName}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Icon name="clock-outline" size={20} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.infoText}>
                    {new Date().toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>

              {livenessProof && (
                <View style={styles.livenessVerifiedBadge}>
                  <Icon name="shield-check" size={14} color="#22C55E" />
                  <Text style={styles.livenessVerifiedText}>Liveness Verified</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.captureButton,
                  verificationState === 'verifying' && styles.captureButtonDisabled,
                ]}
                onPress={handleCapture}
                disabled={verificationState === 'verifying'}>
                <View style={styles.captureButtonInner}>
                  {verificationState === 'verifying' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Icon name="camera" size={32} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>

              <Text style={styles.captureHint}>
                {verificationState === 'verifying' ? 'Verifying your face...' : 'Tap to capture'}
              </Text>
            </>
          )}
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonTop: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 44,
  },
  faceGuide: {
    alignItems: 'center',
  },
  faceFrame: {
    width: 280,
    height: 360,
    borderRadius: 140,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingOverlay: {
    alignItems: 'center',
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: FontSizes.md,
    marginTop: Spacing.sm,
  },
  guideText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSizes.md,
    marginTop: Spacing.lg,
  },
  statusBannersContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  statusBannerText: {
    color: '#FFFFFF',
    fontSize: FontSizes.sm,
    marginLeft: Spacing.sm,
    fontWeight: '500',
  },
  offlineBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
  },
  locationBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  pendingBanner: {
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
  },
  errorBannerNew: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: FontSizes.md,
    marginLeft: Spacing.sm,
  },
  bottomContainer: {
    alignItems: 'center',
    paddingBottom: Spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
  },
  infoText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSizes.md,
    marginLeft: Spacing.xs,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSizes.sm,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  permissionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  permissionText: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  permissionButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  cancelButton: {
    padding: Spacing.md,
  },
  cancelButtonText: {
    fontSize: FontSizes.md,
  },
  // Success screen styles
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  successIcon: {
    marginBottom: Spacing.xl,
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  successMessage: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: FontSizes.lg,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  successTime: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '300',
  },
  offlineSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
  },
  offlineSuccessBadgeText: {
    color: '#FFFFFF',
    fontSize: FontSizes.sm,
    marginLeft: Spacing.xs,
    fontWeight: '500',
  },
  // Matched employee screen styles
  matchedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  greetingContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  greetingText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
    marginTop: Spacing.lg,
  },
  greetingSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSizes.lg,
    marginTop: Spacing.xs,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
  confidenceText: {
    color: '#FFFFFF',
    fontSize: FontSizes.sm,
    marginLeft: Spacing.xs,
    fontWeight: '600',
  },
  confirmationBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    width: '100%',
  },
  confirmationTitle: {
    color: '#FFFFFF',
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  confirmationTime: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '300',
    marginBottom: Spacing.xs,
  },
  confirmationDate: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSizes.md,
  },
  actionButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  confirmButtonText: {
    color: '#3B82F6',
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  retryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  faceFrameSuccess: {
    borderColor: '#22C55E',
  },
  skipButton: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.md,
  },
  skipButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSizes.sm,
  },
  livenessVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  livenessVerifiedText: {
    color: '#22C55E',
    fontSize: FontSizes.xs,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
});
