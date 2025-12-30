import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
  PermissionsAndroid,
  ScrollView,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Camera, useCameraDevice, useCameraPermission} from 'react-native-vision-camera';
import RNFS from 'react-native-fs';

import {useAuthStore, useEmployee, useUser} from '../../store/authStore';
import {attendanceApi} from '../../api/attendanceApi';
import {handleApiError} from '../../api/apiClient';
import {Colors} from '../../theme/colors';
import {Spacing, BorderRadius, FontSizes} from '../../theme/spacing';
import type {RootStackParamList} from '../../types';
import {showToast, showDialog} from '../../utils/alert';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const REQUIRED_PHOTOS = 3;

const PHOTO_INSTRUCTIONS = [
  {angle: 'front', instruction: 'Look straight at the camera', icon: 'face-man'},
  {angle: 'left', instruction: 'Turn your head slightly left', icon: 'face-man-profile'},
  {angle: 'right', instruction: 'Turn your head slightly right', icon: 'face-man-profile'},
];

export default function FaceEnrollmentScreen() {
  const navigation = useNavigation<NavigationProp>();
  const employee = useEmployee();
  const user = useUser();
  const isDarkMode = useAuthStore(state => state.isDarkMode);
  const colors = isDarkMode ? Colors.dark : Colors.light;

  // Get employeeId from employee object, user.employeeId, or user._id
  const employeeId = employee?._id || user?.employeeId || user?._id;

  const camera = useRef<Camera>(null);
  const device = useCameraDevice('front');
  const {hasPermission, requestPermission} = useCameraPermission();

  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentComplete, setEnrollmentComplete] = useState(false);

  const currentPhotoIndex = capturedPhotos.length;
  const currentInstruction = PHOTO_INSTRUCTIONS[currentPhotoIndex] || PHOTO_INSTRUCTIONS[0];

  const handleCapture = useCallback(async () => {
    if (!camera.current || currentPhotoIndex >= REQUIRED_PHOTOS) return;

    setIsCapturing(true);

    try {
      const photo = await camera.current.takePhoto({
        qualityPrioritization: 'quality',
      });

      // Read image and convert to base64
      let base64Image = await RNFS.readFile(photo.path, 'base64');
      base64Image = `data:image/jpeg;base64,${base64Image}`;

      setCapturedPhotos(prev => [...prev, base64Image]);
    } catch (error) {
      console.error('[FaceEnrollment] Error capturing photo:', error);
      showToast.error('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  }, [currentPhotoIndex]);

  const handleRetakePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleEnroll = async () => {
    console.log('[FaceEnrollment] handleEnroll called');
    console.log('[FaceEnrollment] capturedPhotos.length:', capturedPhotos.length);
    console.log('[FaceEnrollment] employeeId:', employeeId);

    if (capturedPhotos.length < REQUIRED_PHOTOS) {
      console.log('[FaceEnrollment] Not enough photos');
      return;
    }
    if (!employeeId) {
      console.log('[FaceEnrollment] No employee ID');
      showToast.error('Error', 'Employee data not found. Please log out and log in again.');
      return;
    }

    setIsEnrolling(true);
    console.log('[FaceEnrollment] Starting enrollment...');

    try {
      console.log('[FaceEnrollment] Calling enrollFace API with employeeId:', employeeId);
      console.log('[FaceEnrollment] Number of images:', capturedPhotos.length);

      const response = await attendanceApi.enrollFace({
        employeeId: employeeId,
        images: capturedPhotos,
      });

      console.log('[FaceEnrollment] API Response:', JSON.stringify(response));

      if (response.success) {
        setEnrollmentComplete(true);
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      } else {
        showDialog.error('Enrollment Failed', response.message || 'Failed to enroll face. Please try again.');
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      showDialog.error('Error', errorMessage);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (!granted) {
      showDialog.warning('Camera Permission Required', 'Please enable camera access in your device settings.', () => {
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
            We need access to your camera to enroll your face for attendance.
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

  // Render enrollment complete screen
  if (enrollmentComplete) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.success}]}>
        <View style={styles.successContainer}>
          <Icon name="check-circle" size={100} color="#FFFFFF" />
          <Text style={styles.successTitle}>Enrolled!</Text>
          <Text style={styles.successMessage}>
            Your face has been enrolled successfully. You can now use face check-in.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render all photos captured - ready to enroll
  if (capturedPhotos.length >= REQUIRED_PHOTOS) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: colors.text}]}>Review Photos</Text>
          <View style={{width: 28}} />
        </View>

        <ScrollView contentContainerStyle={styles.reviewContent}>
          <Text style={[styles.reviewTitle, {color: colors.text}]}>
            Review Your Photos
          </Text>
          <Text style={[styles.reviewSubtitle, {color: colors.textSecondary}]}>
            Tap a photo to retake it
          </Text>

          <View style={styles.photoGrid}>
            {capturedPhotos.map((photo, index) => (
              <TouchableOpacity
                key={index}
                style={styles.photoContainer}
                onPress={() => handleRetakePhoto(index)}>
                <Image source={{uri: photo}} style={styles.photoPreview} />
                <View style={styles.photoOverlay}>
                  <Icon name="refresh" size={24} color="#FFFFFF" />
                </View>
                <Text style={[styles.photoLabel, {color: colors.textSecondary}]}>
                  {PHOTO_INSTRUCTIONS[index].angle.charAt(0).toUpperCase() +
                    PHOTO_INSTRUCTIONS[index].angle.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.enrollButton, {backgroundColor: colors.primary}, isEnrolling && styles.buttonDisabled]}
            onPress={handleEnroll}
            disabled={isEnrolling}>
            {isEnrolling ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Icon name="face-recognition" size={24} color="#FFFFFF" />
                <Text style={styles.enrollButtonText}>Enroll My Face</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Render camera screen for capturing photos
  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={!isCapturing}
        photo={true}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Header */}
        <SafeAreaView edges={['top']}>
          <View style={styles.cameraHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => navigation.goBack()}>
              <Icon name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.cameraHeaderTitle}>Face Enrollment</Text>
            <View style={{width: 44}} />
          </View>

          {/* Progress */}
          <View style={styles.progressContainer}>
            {PHOTO_INSTRUCTIONS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index < currentPhotoIndex && styles.progressDotComplete,
                  index === currentPhotoIndex && styles.progressDotCurrent,
                ]}
              />
            ))}
          </View>
        </SafeAreaView>

        {/* Face Guide */}
        <View style={styles.faceGuide}>
          <View style={styles.faceFrame}>
            {isCapturing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            )}
          </View>

          <View style={styles.instructionContainer}>
            <Icon name={currentInstruction.icon} size={32} color="#FFFFFF" />
            <Text style={styles.instructionText}>
              Photo {currentPhotoIndex + 1} of {REQUIRED_PHOTOS}
            </Text>
            <Text style={styles.instructionDetail}>
              {currentInstruction.instruction}
            </Text>
          </View>
        </View>

        {/* Captured Photos Thumbnails */}
        {capturedPhotos.length > 0 && (
          <View style={styles.thumbnailContainer}>
            {capturedPhotos.map((photo, index) => (
              <View key={index} style={styles.thumbnail}>
                <Image source={{uri: photo}} style={styles.thumbnailImage} />
                <View style={styles.thumbnailCheck}>
                  <Icon name="check" size={12} color="#FFFFFF" />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Capture Button */}
        <SafeAreaView edges={['bottom']} style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
            onPress={handleCapture}
            disabled={isCapturing}>
            <View style={styles.captureButtonInner}>
              {isCapturing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Icon name="camera" size={32} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.captureHint}>
            {isCapturing ? 'Capturing...' : 'Tap to capture'}
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
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  cameraHeader: {
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
  cameraHeaderTitle: {
    color: '#FFFFFF',
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: Spacing.xs,
  },
  progressDotComplete: {
    backgroundColor: '#22C55E',
  },
  progressDotCurrent: {
    backgroundColor: '#3B82F6',
    width: 30,
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
  instructionContainer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BorderRadius.lg,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  instructionDetail: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSizes.md,
    marginTop: Spacing.xs,
  },
  thumbnailContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginHorizontal: Spacing.xs,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailCheck: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#22C55E',
    borderRadius: 8,
    padding: 2,
  },
  bottomContainer: {
    alignItems: 'center',
    paddingBottom: Spacing.xl,
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
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  successMessage: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: FontSizes.lg,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  reviewContent: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  reviewTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  reviewSubtitle: {
    fontSize: FontSizes.md,
    marginBottom: Spacing.lg,
  },
  photoGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: Spacing.xl,
  },
  photoContainer: {
    margin: Spacing.sm,
    alignItems: 'center',
  },
  photoPreview: {
    width: 100,
    height: 130,
    borderRadius: BorderRadius.md,
    backgroundColor: '#E5E7EB',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoLabel: {
    marginTop: Spacing.xs,
    fontSize: FontSizes.sm,
  },
  enrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    width: '100%',
  },
  enrollButtonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
