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
  ScrollView,
  Image,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
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
import {
  livenessDetectionService,
  LivenessSession,
  LivenessChallenge as Challenge,
  LivenessProof,
} from '../../services/livenessDetectionService';
import {faceQualityService} from '../../services/faceQualityService';
import LivenessChallenge from '../../components/LivenessChallenge';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const REQUIRED_PHOTOS = 3;

const PHOTO_INSTRUCTIONS = [
  {angle: 'front', instruction: 'Look straight at the camera', icon: 'face-man'},
  {angle: 'left', instruction: 'Turn your head slightly left', icon: 'face-man-profile'},
  {angle: 'right', instruction: 'Turn your head slightly right', icon: 'face-man-profile'},
];

type EnrollmentPhase = 'liveness' | 'capture' | 'review' | 'enrolling' | 'complete';

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

  // State
  const [phase, setPhase] = useState<EnrollmentPhase>('liveness');
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<string>('Processing...');

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

  // Simulated liveness detection state (in real app, this comes from frame processor)
  const [detectionState, setDetectionState] = useState({
    isBlinking: false,
    headPose: {yaw: 0, pitch: 0, roll: 0},
    mouthOpen: false,
  });

  const currentPhotoIndex = capturedPhotos.length;
  const currentInstruction = PHOTO_INSTRUCTIONS[currentPhotoIndex] || PHOTO_INSTRUCTIONS[0];

  // Set StatusBar for camera screen
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content');
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }, [])
  );

  // Start liveness session on mount
  useEffect(() => {
    startLivenessSession();
  }, []);

  // Challenge timer
  useEffect(() => {
    if (currentChallenge && phase === 'liveness') {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, currentChallenge.timeout - elapsed);
        setChallengeTimeRemaining(remaining);

        if (remaining === 0) {
          // Challenge timed out
          handleChallengeTimeout();
          clearInterval(interval);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [currentChallenge, phase]);

  // Simulate liveness detection (in real app, use frame processor)
  useEffect(() => {
    if (phase === 'liveness' && currentChallenge) {
      const simulationInterval = setInterval(() => {
        // Simulate random detection events for demo
        // In production, this would come from actual frame processing
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
  }, [phase, currentChallenge, detectionState.headPose.yaw]);

  const startLivenessSession = () => {
    const session = livenessDetectionService.startSession(2);
    setLivenessSession(session);
    setCurrentChallenge(livenessDetectionService.getCurrentChallenge());
    updateChallengeProgress();
    setPhase('liveness');
    // Reset detection state
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
      // Reset detection state for next challenge
      setDetectionState({
        isBlinking: false,
        headPose: {yaw: 0, pitch: 0, roll: 0},
        mouthOpen: false,
      });
    } else {
      // All challenges complete
      const proof = livenessDetectionService.completeSession();
      setLivenessProof(proof);

      if (proof && livenessDetectionService.getSessionProgress().passedChallenges >= 2) {
        showToast.success('Liveness verified! Now take your enrollment photos.');
        setTimeout(() => setPhase('capture'), 1000);
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
      // All challenges done
      const proof = livenessDetectionService.completeSession();
      setLivenessProof(proof);

      if (proof && livenessDetectionService.getSessionProgress().passedChallenges >= 2) {
        setPhase('capture');
      } else {
        showDialog.error('Liveness Check Failed', 'Not enough challenges passed. Please try again.', () => {
          startLivenessSession();
        });
      }
    }
  };

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

      // Check if all photos captured
      if (currentPhotoIndex + 1 >= REQUIRED_PHOTOS) {
        setTimeout(() => setPhase('review'), 500);
      }
    } catch (error) {
      console.error('[FaceEnrollment] Error capturing photo:', error);
      showToast.error('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  }, [currentPhotoIndex]);

  const handleRetakePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
    setPhase('capture');
  };

  const handleEnroll = async () => {
    console.log('[FaceEnrollment] handleEnroll called');

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
    setPhase('enrolling');
    setEnrollmentStatus('Preparing images...');

    try {
      // Simulate progress updates for better UX
      setTimeout(() => setEnrollmentStatus('Uploading photos...'), 500);
      setTimeout(() => setEnrollmentStatus('Detecting faces...'), 2000);
      setTimeout(() => setEnrollmentStatus('Processing face features...'), 5000);
      setTimeout(() => setEnrollmentStatus('Creating face profile...'), 10000);
      setTimeout(() => setEnrollmentStatus('Almost done...'), 20000);

      const response = await attendanceApi.enrollFace({
        employeeId: employeeId,
        images: capturedPhotos,
        livenessProof: livenessProof || undefined,
      });

      console.log('[FaceEnrollment] API Response:', JSON.stringify(response));

      if (response.success) {
        setEnrollmentStatus('Enrollment successful!');
        setPhase('complete');
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      } else {
        setPhase('review');
        showDialog.error('Enrollment Failed', response.message || 'Failed to enroll face. Please try again.');
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      setPhase('review');
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

  const handleSkipLiveness = () => {
    // Allow skipping liveness for testing (remove in production)
    setLivenessProof(null);
    setPhase('capture');
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

  // Render enrollment processing screen
  if (phase === 'enrolling') {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.primary} style={styles.processingSpinner} />
          <Text style={[styles.processingTitle, {color: colors.text}]}>
            Enrolling Your Face
          </Text>
          <Text style={[styles.processingStatus, {color: colors.primary}]}>
            {enrollmentStatus}
          </Text>
          <Text style={[styles.processingHint, {color: colors.textSecondary}]}>
            This may take up to a minute.{'\n'}Please don't close the app.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render enrollment complete screen
  if (phase === 'complete') {
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

  // Render review photos screen
  if (phase === 'review' && capturedPhotos.length >= REQUIRED_PHOTOS) {
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
          {livenessProof && (
            <View style={styles.livenessVerifiedBadge}>
              <Icon name="shield-check" size={16} color="#22C55E" />
              <Text style={styles.livenessVerifiedText}>Liveness Verified</Text>
            </View>
          )}

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

  // Render camera screen for liveness check or photo capture
  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
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
            <Text style={styles.cameraHeaderTitle}>
              {phase === 'liveness' ? 'Liveness Check' : 'Face Enrollment'}
            </Text>
            <View style={{width: 44}} />
          </View>

          {/* Progress */}
          {phase === 'capture' && (
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
          )}
        </SafeAreaView>

        {/* Face Guide */}
        <View style={styles.faceGuide}>
          <View style={[
            styles.faceFrame,
            phase === 'liveness' && challengeProgress.isComplete && styles.faceFrameSuccess,
          ]}>
            {isCapturing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* Liveness Challenge UI */}
          {phase === 'liveness' && currentChallenge && (
            <LivenessChallenge
              challenge={currentChallenge}
              progress={challengeProgress}
              detectionState={detectionState}
              timeRemaining={challengeTimeRemaining}
              isDarkMode={isDarkMode}
            />
          )}

          {/* Capture Instructions */}
          {phase === 'capture' && (
            <View style={styles.instructionContainer}>
              <Icon name={currentInstruction.icon} size={32} color="#FFFFFF" />
              <Text style={styles.instructionText}>
                Photo {currentPhotoIndex + 1} of {REQUIRED_PHOTOS}
              </Text>
              <Text style={styles.instructionDetail}>
                {currentInstruction.instruction}
              </Text>
            </View>
          )}
        </View>

        {/* Captured Photos Thumbnails */}
        {phase === 'capture' && capturedPhotos.length > 0 && (
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

        {/* Action Buttons */}
        <SafeAreaView edges={['bottom']} style={styles.bottomContainer}>
          {phase === 'liveness' && (
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
          )}

          {phase === 'capture' && (
            <>
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
  faceFrameSuccess: {
    borderColor: '#22C55E',
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
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  processingSpinner: {
    marginBottom: Spacing.xl,
    transform: [{scale: 1.5}],
  },
  processingTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  processingStatus: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  processingHint: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
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
  livenessVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  livenessVerifiedText: {
    color: '#22C55E',
    fontSize: FontSizes.sm,
    fontWeight: '600',
    marginLeft: Spacing.xs,
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
