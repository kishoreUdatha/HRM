import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
  PermissionsAndroid,
  Animated,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Camera, useCameraDevice, useCameraPermission} from 'react-native-vision-camera';
import Geolocation from '@react-native-community/geolocation';
import RNFS from 'react-native-fs';

import {useAuthStore, useEmployee} from '../../store/authStore';
import {attendanceApi, VerifyFaceResponse} from '../../api/attendanceApi';
import {handleApiError} from '../../api/apiClient';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import type {RootStackParamList} from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type VerificationState = 'camera' | 'verifying' | 'matched' | 'confirming' | 'success' | 'error';

export default function FaceCheckInScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const employee = useEmployee();
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  const isCheckOut = route.name === 'FaceCheckOut';

  const camera = useRef<Camera>(null);
  const device = useCameraDevice('front');
  const {hasPermission, requestPermission} = useCameraPermission();

  const [verificationState, setVerificationState] = useState<VerificationState>('camera');
  const [isCapturing, setIsCapturing] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [matchedEmployee, setMatchedEmployee] = useState<{
    employeeId: string;
    employeeName: string;
    confidence: number;
  } | null>(null);
  const [location, setLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Animation for success state
  const successScale = useRef(new Animated.Value(0)).current;

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
    setVerificationState('verifying');
    setLocationError(null);

    try {
      // Request location permission
      const hasLocationPermission = await requestLocationPermission();
      if (!hasLocationPermission) {
        Alert.alert(
          'Location Permission Required',
          'Please enable location access to check in.',
          [
            {text: 'Cancel', style: 'cancel', onPress: () => setVerificationState('camera')},
            {text: 'Open Settings', onPress: () => Linking.openSettings()},
          ]
        );
        setIsCapturing(false);
        return;
      }

      // Get location and take photo in parallel
      const photoPromise = camera.current.takePhoto({
        qualityPrioritization: 'quality',
      });
      const locationPromise = getCurrentLocation();

      const photo = await photoPromise;

      // Get location
      let currentLocation;
      try {
        currentLocation = await locationPromise;
        setLocation(currentLocation);
      } catch (locError: any) {
        const errorCode = locError?.code;
        if (errorCode === 2) {
          setLocationError('GPS is turned off.');
          Alert.alert(
            'Turn On Location',
            'GPS is required for attendance check-in.',
            [
              {text: 'Cancel', style: 'cancel', onPress: () => setVerificationState('camera')},
              {text: 'Turn On GPS', onPress: openLocationSettings},
            ]
          );
        } else {
          setLocationError('Could not get your location.');
        }
        setIsCapturing(false);
        setVerificationState('camera');
        return;
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

      console.log('[FaceCheckIn] Calling verify-face API...');

      // Call verify-face API
      const verifyResponse = await attendanceApi.verifyFace({
        faceImage: base64Image,
        location: currentLocation,
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
          errorMessage = 'Your face is not enrolled yet. Would you like to enroll now?';
          Alert.alert(
            'Face Not Enrolled',
            errorMessage,
            [
              {text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack()},
              {text: 'Enroll Now', onPress: () => navigation.replace('FaceEnrollment')},
            ]
          );
          return;
        } else if (verifyResponse.status === 'NO_MATCH') {
          errorMessage = 'Face not recognized. Please try again or contact HR.';
        }

        Alert.alert(
          'Verification Failed',
          errorMessage,
          [{text: 'Retry', onPress: () => setVerificationState('camera')}]
        );
      }
    } catch (error) {
      console.error('[FaceCheckIn] Error:', error);
      const errorMessage = handleApiError(error);
      setVerificationState('error');
      Alert.alert('Error', errorMessage, [
        {text: 'Retry', onPress: () => setVerificationState('camera')},
      ]);
    } finally {
      setIsCapturing(false);
    }
  }, []);

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
        Alert.alert('Error', response.message || 'Check-in failed', [
          {text: 'OK', onPress: () => setVerificationState('camera')},
        ]);
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      Alert.alert('Error', errorMessage, [
        {text: 'OK', onPress: () => setVerificationState('camera')},
      ]);
    }
  };

  const handleRetry = () => {
    setMatchedEmployee(null);
    setVerificationState('camera');
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (!granted) {
      Alert.alert(
        'Camera Permission Required',
        'Please enable camera access in your device settings to use face check-in.',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Open Settings', onPress: () => Linking.openSettings()},
        ]
      );
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
      <SafeAreaView style={[styles.container, {backgroundColor: colors.success}]}>
        <View style={styles.successContainer}>
          <Animated.View style={[styles.successIcon, {transform: [{scale: successScale}]}]}>
            <Icon name="check-circle" size={100} color="#FFFFFF" />
          </Animated.View>
          <Text style={styles.successTitle}>
            {isCheckOut ? 'Checked Out!' : 'Checked In!'}
          </Text>
          <Text style={styles.successMessage}>{successMessage}</Text>
          <Text style={styles.successTime}>
            {new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
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
        isActive={verificationState === 'camera' && !isCapturing}
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
          <View style={styles.faceFrame}>
            {verificationState === 'verifying' && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.processingText}>Verifying...</Text>
              </View>
            )}
          </View>
          <Text style={styles.guideText}>
            Position your face within the frame
          </Text>
        </View>

        {/* Location Error */}
        {locationError && (
          <View style={styles.errorBanner}>
            <Icon name="map-marker-alert" size={20} color={colors.error} />
            <Text style={styles.errorText}>{locationError}</Text>
          </View>
        )}

        {/* Capture Button */}
        <SafeAreaView edges={['bottom']} style={styles.bottomContainer}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Icon name="account" size={20} color="rgba(255,255,255,0.8)" />
              <Text style={styles.infoText}>
                {employee?.firstName} {employee?.lastName}
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
});
