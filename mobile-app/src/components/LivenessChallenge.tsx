// Liveness Challenge Component for Face Recognition Anti-Spoofing
// Displays current challenge and progress with visual feedback

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { LivenessChallenge as Challenge, ChallengeResult } from '../services/livenessDetectionService';

interface LivenessChallengeProps {
  challenge: Challenge | null;
  progress: {
    currentChallenge: number;
    totalChallenges: number;
    passedChallenges: number;
    isComplete: boolean;
  };
  detectionState?: {
    isBlinking: boolean;
    headPose: { yaw: number; pitch: number; roll: number };
    mouthOpen: boolean;
  };
  onChallengeComplete?: (result: ChallengeResult) => void;
  timeRemaining?: number;
  isDarkMode?: boolean;
}

const CHALLENGE_ICONS: Record<string, string> = {
  blink: 'eye-outline',
  head_turn_left: 'arrow-left-bold',
  head_turn_right: 'arrow-right-bold',
  smile: 'emoticon-happy-outline',
  nod: 'arrow-down-bold',
};

const CHALLENGE_COLORS = {
  pending: '#6B7280',
  active: '#3B82F6',
  success: '#22C55E',
  failed: '#EF4444',
};

export default function LivenessChallenge({
  challenge,
  progress,
  detectionState,
  onChallengeComplete,
  timeRemaining,
  isDarkMode = false,
}: LivenessChallengeProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [showSuccess, setShowSuccess] = useState(false);

  // Pulse animation for active challenge
  useEffect(() => {
    if (challenge) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [challenge, pulseAnim]);

  // Progress bar animation
  useEffect(() => {
    if (timeRemaining !== undefined && challenge) {
      const remainingRatio = timeRemaining / challenge.timeout;
      Animated.timing(progressAnim, {
        toValue: 1 - remainingRatio,
        duration: 100,
        useNativeDriver: false,
      }).start();
    }
  }, [timeRemaining, challenge, progressAnim]);

  // Show success feedback briefly
  useEffect(() => {
    if (progress.passedChallenges > 0) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 500);
      return () => clearTimeout(timer);
    }
  }, [progress.passedChallenges]);

  if (progress.isComplete) {
    return (
      <View style={styles.container}>
        <View style={[styles.completeBadge, { backgroundColor: CHALLENGE_COLORS.success }]}>
          <Icon name="check-circle" size={24} color="#FFFFFF" />
          <Text style={styles.completeText}>Liveness Verified</Text>
        </View>
      </View>
    );
  }

  if (!challenge) {
    return null;
  }

  const iconName = CHALLENGE_ICONS[challenge.type] || 'help-circle-outline';

  // Calculate detection feedback
  const getDetectionFeedback = () => {
    if (!detectionState) return null;

    switch (challenge.type) {
      case 'blink':
        return detectionState.isBlinking ? (
          <Text style={styles.feedbackText}>Blink detected!</Text>
        ) : (
          <Text style={styles.feedbackHint}>Blink your eyes naturally</Text>
        );

      case 'head_turn_left':
        const leftProgress = Math.min(100, Math.abs(Math.min(0, detectionState.headPose.yaw)) / 15 * 100);
        return (
          <View style={styles.feedbackRow}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${leftProgress}%` }]} />
            </View>
            <Text style={styles.feedbackPercent}>{Math.round(leftProgress)}%</Text>
          </View>
        );

      case 'head_turn_right':
        const rightProgress = Math.min(100, Math.max(0, detectionState.headPose.yaw) / 15 * 100);
        return (
          <View style={styles.feedbackRow}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${rightProgress}%` }]} />
            </View>
            <Text style={styles.feedbackPercent}>{Math.round(rightProgress)}%</Text>
          </View>
        );

      case 'smile':
        return detectionState.mouthOpen ? (
          <Text style={styles.feedbackText}>Smile detected!</Text>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress dots */}
      <View style={styles.progressDots}>
        {Array.from({ length: progress.totalChallenges }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index < progress.passedChallenges && styles.progressDotComplete,
              index === progress.currentChallenge - 1 && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      {/* Challenge card */}
      <View style={[styles.challengeCard, isDarkMode && styles.challengeCardDark]}>
        {/* Timer bar */}
        {timeRemaining !== undefined && (
          <View style={styles.timerBarContainer}>
            <Animated.View
              style={[
                styles.timerBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: timeRemaining < 2000 ? CHALLENGE_COLORS.failed : CHALLENGE_COLORS.active,
                },
              ]}
            />
          </View>
        )}

        {/* Challenge icon and instruction */}
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
          <View style={[styles.iconCircle, showSuccess && styles.iconCircleSuccess]}>
            <Icon
              name={showSuccess ? 'check' : iconName}
              size={32}
              color={showSuccess ? CHALLENGE_COLORS.success : CHALLENGE_COLORS.active}
            />
          </View>
        </Animated.View>

        <Text style={[styles.instructionText, isDarkMode && styles.textLight]}>
          {challenge.instruction}
        </Text>

        <Text style={styles.stepText}>
          Challenge {progress.currentChallenge} of {progress.totalChallenges}
        </Text>

        {/* Detection feedback */}
        <View style={styles.feedbackContainer}>
          {getDetectionFeedback()}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
  },
  progressDots: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 4,
  },
  progressDotComplete: {
    backgroundColor: CHALLENGE_COLORS.success,
  },
  progressDotActive: {
    backgroundColor: CHALLENGE_COLORS.active,
    width: 24,
  },
  challengeCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  challengeCardDark: {
    backgroundColor: 'rgba(30,30,30,0.95)',
  },
  timerBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  timerBar: {
    height: '100%',
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: CHALLENGE_COLORS.active,
  },
  iconCircleSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: CHALLENGE_COLORS.success,
  },
  instructionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  textLight: {
    color: '#F3F4F6',
  },
  stepText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  feedbackContainer: {
    minHeight: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackText: {
    fontSize: 14,
    color: CHALLENGE_COLORS.success,
    fontWeight: '600',
  },
  feedbackHint: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: CHALLENGE_COLORS.active,
    borderRadius: 4,
  },
  feedbackPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: CHALLENGE_COLORS.active,
    width: 40,
    textAlign: 'right',
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  completeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});
