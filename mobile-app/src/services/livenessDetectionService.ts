// Liveness Detection Service for Face Recognition Anti-Spoofing
// Implements blink detection, head movement challenges, and session management

// Generate UUID locally (no external dependency)
const uuidv4 = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Types
export type ChallengeType = 'blink' | 'head_turn_left' | 'head_turn_right' | 'smile' | 'nod';

export interface LivenessChallenge {
  type: ChallengeType;
  instruction: string;
  icon: string;
  timeout: number; // ms
  detectionConfig: {
    threshold: number;
    minDuration: number; // ms
    maxAttempts: number;
  };
}

export interface ChallengeResult {
  type: ChallengeType;
  passed: boolean;
  confidence: number;
  timestamp: number;
  duration: number; // ms
}

export interface LivenessSession {
  sessionId: string;
  challenges: LivenessChallenge[];
  results: ChallengeResult[];
  startTime: number;
  endTime?: number;
  passed: boolean;
}

export interface LivenessProof {
  sessionId: string;
  challenges: Array<{
    type: string;
    passed: boolean;
    timestamp: number;
  }>;
  signature: string;
}

export interface FaceLandmarks {
  leftEye: { x: number; y: number }[];
  rightEye: { x: number; y: number }[];
  nose: { x: number; y: number };
  mouth: { x: number; y: number }[];
  jawline: { x: number; y: number }[];
}

export interface LivenessDetectionState {
  isBlinking: boolean;
  blinkCount: number;
  headPose: {
    yaw: number; // Left/right rotation
    pitch: number; // Up/down rotation
    roll: number; // Tilt
  };
  mouthOpen: boolean;
  facePresent: boolean;
  faceSize: number; // Relative to frame
}

// Challenge definitions
const CHALLENGE_DEFINITIONS: Record<ChallengeType, LivenessChallenge> = {
  blink: {
    type: 'blink',
    instruction: 'Blink your eyes',
    icon: 'eye-outline',
    timeout: 5000,
    detectionConfig: {
      threshold: 0.25, // EAR threshold
      minDuration: 100, // Minimum blink duration
      maxAttempts: 3,
    },
  },
  head_turn_left: {
    type: 'head_turn_left',
    instruction: 'Turn your head left',
    icon: 'arrow-left',
    timeout: 5000,
    detectionConfig: {
      threshold: 15, // Degrees
      minDuration: 500,
      maxAttempts: 3,
    },
  },
  head_turn_right: {
    type: 'head_turn_right',
    instruction: 'Turn your head right',
    icon: 'arrow-right',
    timeout: 5000,
    detectionConfig: {
      threshold: 15, // Degrees
      minDuration: 500,
      maxAttempts: 3,
    },
  },
  smile: {
    type: 'smile',
    instruction: 'Smile',
    icon: 'emoticon-happy-outline',
    timeout: 5000,
    detectionConfig: {
      threshold: 0.5, // Mouth aspect ratio change
      minDuration: 300,
      maxAttempts: 3,
    },
  },
  nod: {
    type: 'nod',
    instruction: 'Nod your head',
    icon: 'arrow-down',
    timeout: 5000,
    detectionConfig: {
      threshold: 10, // Degrees pitch change
      minDuration: 300,
      maxAttempts: 3,
    },
  },
};

// Configuration
const CONFIG = {
  MIN_CHALLENGES: 2,
  MAX_CHALLENGES: 3,
  SESSION_TIMEOUT: 60000, // 1 minute
  EYE_ASPECT_RATIO_THRESHOLD: 0.25,
  BLINK_CONSECUTIVE_FRAMES: 2,
  HEAD_TURN_THRESHOLD_DEGREES: 15,
  MIN_FACE_SIZE: 0.15, // 15% of frame
  MAX_FACE_SIZE: 0.85, // 85% of frame
};

class LivenessDetectionService {
  private currentSession: LivenessSession | null = null;
  private blinkHistory: boolean[] = [];
  private headPoseHistory: Array<{ yaw: number; pitch: number }> = [];
  private lastDetectionState: LivenessDetectionState | null = null;

  /**
   * Start a new liveness detection session
   */
  startSession(numChallenges: number = CONFIG.MIN_CHALLENGES): LivenessSession {
    // Select random challenges
    const availableChallenges: ChallengeType[] = ['blink', 'head_turn_left', 'head_turn_right'];
    const selectedTypes = this.selectRandomChallenges(availableChallenges, numChallenges);

    const challenges = selectedTypes.map(type => ({ ...CHALLENGE_DEFINITIONS[type] }));

    this.currentSession = {
      sessionId: uuidv4(),
      challenges,
      results: [],
      startTime: Date.now(),
      passed: false,
    };

    // Reset detection state
    this.blinkHistory = [];
    this.headPoseHistory = [];
    this.lastDetectionState = null;

    console.log('[Liveness] Session started:', this.currentSession.sessionId);
    console.log('[Liveness] Challenges:', selectedTypes);

    return this.currentSession;
  }

  /**
   * Select random challenges without repetition
   */
  private selectRandomChallenges(available: ChallengeType[], count: number): ChallengeType[] {
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, available.length));
  }

  /**
   * Get current challenge
   */
  getCurrentChallenge(): LivenessChallenge | null {
    if (!this.currentSession) return null;
    const completedCount = this.currentSession.results.length;
    if (completedCount >= this.currentSession.challenges.length) return null;
    return this.currentSession.challenges[completedCount];
  }

  /**
   * Process face landmarks and update detection state
   */
  processLandmarks(landmarks: FaceLandmarks, frameWidth: number, frameHeight: number): LivenessDetectionState {
    const state: LivenessDetectionState = {
      isBlinking: false,
      blinkCount: this.blinkHistory.filter(b => b).length,
      headPose: { yaw: 0, pitch: 0, roll: 0 },
      mouthOpen: false,
      facePresent: true,
      faceSize: this.calculateFaceSize(landmarks, frameWidth, frameHeight),
    };

    // Calculate Eye Aspect Ratio (EAR) for blink detection
    const leftEAR = this.calculateEAR(landmarks.leftEye);
    const rightEAR = this.calculateEAR(landmarks.rightEye);
    const avgEAR = (leftEAR + rightEAR) / 2;

    state.isBlinking = avgEAR < CONFIG.EYE_ASPECT_RATIO_THRESHOLD;

    // Track blink history
    this.blinkHistory.push(state.isBlinking);
    if (this.blinkHistory.length > 30) {
      this.blinkHistory.shift();
    }

    // Calculate head pose from landmarks
    state.headPose = this.estimateHeadPose(landmarks);

    // Track head pose history
    this.headPoseHistory.push({ yaw: state.headPose.yaw, pitch: state.headPose.pitch });
    if (this.headPoseHistory.length > 30) {
      this.headPoseHistory.shift();
    }

    // Calculate mouth aspect ratio
    state.mouthOpen = this.isMouthOpen(landmarks.mouth);

    this.lastDetectionState = state;
    return state;
  }

  /**
   * Calculate Eye Aspect Ratio (EAR)
   * Lower EAR = more closed eyes
   */
  private calculateEAR(eyePoints: { x: number; y: number }[]): number {
    if (eyePoints.length < 6) return 1; // Invalid landmarks

    // Vertical distances
    const v1 = this.distance(eyePoints[1], eyePoints[5]);
    const v2 = this.distance(eyePoints[2], eyePoints[4]);

    // Horizontal distance
    const h = this.distance(eyePoints[0], eyePoints[3]);

    if (h === 0) return 1;
    return (v1 + v2) / (2 * h);
  }

  /**
   * Estimate head pose from face landmarks
   */
  private estimateHeadPose(landmarks: FaceLandmarks): { yaw: number; pitch: number; roll: number } {
    // Simplified head pose estimation using nose position relative to eyes
    const leftEyeCenter = this.getCentroid(landmarks.leftEye);
    const rightEyeCenter = this.getCentroid(landmarks.rightEye);
    const eyeCenter = {
      x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
      y: (leftEyeCenter.y + rightEyeCenter.y) / 2,
    };

    // Yaw: nose X position relative to eye center (left/right)
    const noseOffsetX = landmarks.nose.x - eyeCenter.x;
    const eyeWidth = Math.abs(rightEyeCenter.x - leftEyeCenter.x);
    const yaw = eyeWidth > 0 ? (noseOffsetX / eyeWidth) * 90 : 0;

    // Pitch: nose Y position relative to eye center (up/down)
    const noseOffsetY = landmarks.nose.y - eyeCenter.y;
    const pitch = eyeWidth > 0 ? (noseOffsetY / eyeWidth) * 45 : 0;

    // Roll: angle between eyes
    const roll = Math.atan2(
      rightEyeCenter.y - leftEyeCenter.y,
      rightEyeCenter.x - leftEyeCenter.x
    ) * (180 / Math.PI);

    return { yaw, pitch, roll };
  }

  /**
   * Check if mouth is open
   */
  private isMouthOpen(mouthPoints: { x: number; y: number }[]): boolean {
    if (mouthPoints.length < 8) return false;

    // Calculate mouth aspect ratio
    const topLip = mouthPoints[2]; // Upper lip center
    const bottomLip = mouthPoints[6]; // Lower lip center
    const leftCorner = mouthPoints[0];
    const rightCorner = mouthPoints[4];

    const verticalDist = Math.abs(bottomLip.y - topLip.y);
    const horizontalDist = Math.abs(rightCorner.x - leftCorner.x);

    const ratio = horizontalDist > 0 ? verticalDist / horizontalDist : 0;
    return ratio > 0.3; // Threshold for open mouth
  }

  /**
   * Calculate face size relative to frame
   */
  private calculateFaceSize(
    landmarks: FaceLandmarks,
    frameWidth: number,
    frameHeight: number
  ): number {
    if (!landmarks.jawline || landmarks.jawline.length < 2) return 0;

    const minX = Math.min(...landmarks.jawline.map(p => p.x));
    const maxX = Math.max(...landmarks.jawline.map(p => p.x));
    const minY = Math.min(...landmarks.jawline.map(p => p.y));
    const maxY = Math.max(...landmarks.jawline.map(p => p.y));

    const faceWidth = maxX - minX;
    const faceHeight = maxY - minY;
    const faceArea = faceWidth * faceHeight;
    const frameArea = frameWidth * frameHeight;

    return frameArea > 0 ? faceArea / frameArea : 0;
  }

  /**
   * Calculate distance between two points
   */
  private distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  /**
   * Calculate centroid of points
   */
  private getCentroid(points: { x: number; y: number }[]): { x: number; y: number } {
    const sum = points.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 }
    );
    return {
      x: sum.x / points.length,
      y: sum.y / points.length,
    };
  }

  /**
   * Check if current challenge is completed
   */
  checkChallengeCompletion(): { completed: boolean; confidence: number } {
    const challenge = this.getCurrentChallenge();
    if (!challenge || !this.lastDetectionState) {
      return { completed: false, confidence: 0 };
    }

    switch (challenge.type) {
      case 'blink':
        return this.checkBlinkChallenge(challenge);
      case 'head_turn_left':
        return this.checkHeadTurnChallenge('left', challenge);
      case 'head_turn_right':
        return this.checkHeadTurnChallenge('right', challenge);
      case 'smile':
        return this.checkSmileChallenge(challenge);
      case 'nod':
        return this.checkNodChallenge(challenge);
      default:
        return { completed: false, confidence: 0 };
    }
  }

  /**
   * Check blink challenge completion
   */
  private checkBlinkChallenge(challenge: LivenessChallenge): { completed: boolean; confidence: number } {
    // Look for blink pattern in history (closed -> open transition)
    let blinkDetected = false;
    let consecutiveClosed = 0;

    for (let i = 0; i < this.blinkHistory.length - 1; i++) {
      if (this.blinkHistory[i]) {
        consecutiveClosed++;
      } else {
        if (consecutiveClosed >= CONFIG.BLINK_CONSECUTIVE_FRAMES) {
          blinkDetected = true;
          break;
        }
        consecutiveClosed = 0;
      }
    }

    return {
      completed: blinkDetected,
      confidence: blinkDetected ? 0.9 : 0,
    };
  }

  /**
   * Check head turn challenge completion
   */
  private checkHeadTurnChallenge(
    direction: 'left' | 'right',
    challenge: LivenessChallenge
  ): { completed: boolean; confidence: number } {
    if (this.headPoseHistory.length < 5) {
      return { completed: false, confidence: 0 };
    }

    const threshold = challenge.detectionConfig.threshold;
    const targetYaw = direction === 'left' ? -threshold : threshold;

    // Check if head reached the target position
    const reachedTarget = this.headPoseHistory.some(pose =>
      direction === 'left' ? pose.yaw <= -threshold : pose.yaw >= threshold
    );

    if (!reachedTarget) {
      return { completed: false, confidence: 0 };
    }

    // Calculate confidence based on how far the head turned
    const maxYaw = direction === 'left'
      ? Math.min(...this.headPoseHistory.map(p => p.yaw))
      : Math.max(...this.headPoseHistory.map(p => p.yaw));

    const confidence = Math.min(1, Math.abs(maxYaw) / (threshold * 2));

    return {
      completed: true,
      confidence,
    };
  }

  /**
   * Check smile challenge completion
   */
  private checkSmileChallenge(challenge: LivenessChallenge): { completed: boolean; confidence: number } {
    if (!this.lastDetectionState) {
      return { completed: false, confidence: 0 };
    }

    return {
      completed: this.lastDetectionState.mouthOpen,
      confidence: this.lastDetectionState.mouthOpen ? 0.85 : 0,
    };
  }

  /**
   * Check nod challenge completion
   */
  private checkNodChallenge(challenge: LivenessChallenge): { completed: boolean; confidence: number } {
    if (this.headPoseHistory.length < 5) {
      return { completed: false, confidence: 0 };
    }

    const threshold = challenge.detectionConfig.threshold;

    // Look for up-down pattern
    const pitchValues = this.headPoseHistory.map(p => p.pitch);
    const maxPitch = Math.max(...pitchValues);
    const minPitch = Math.min(...pitchValues);
    const pitchRange = maxPitch - minPitch;

    const completed = pitchRange >= threshold;
    const confidence = Math.min(1, pitchRange / (threshold * 2));

    return { completed, confidence };
  }

  /**
   * Record challenge result and move to next
   */
  recordChallengeResult(passed: boolean, confidence: number): ChallengeResult | null {
    if (!this.currentSession) return null;

    const challenge = this.getCurrentChallenge();
    if (!challenge) return null;

    const result: ChallengeResult = {
      type: challenge.type,
      passed,
      confidence,
      timestamp: Date.now(),
      duration: Date.now() - this.currentSession.startTime,
    };

    this.currentSession.results.push(result);

    // Reset detection state for next challenge
    this.blinkHistory = [];
    this.headPoseHistory = [];

    console.log('[Liveness] Challenge result:', result);

    return result;
  }

  /**
   * Complete the session and generate proof
   */
  completeSession(): LivenessProof | null {
    if (!this.currentSession) return null;

    this.currentSession.endTime = Date.now();

    // Check if all challenges passed
    const passedChallenges = this.currentSession.results.filter(r => r.passed);
    this.currentSession.passed = passedChallenges.length >= CONFIG.MIN_CHALLENGES;

    // Generate proof
    const proof: LivenessProof = {
      sessionId: this.currentSession.sessionId,
      challenges: this.currentSession.results.map(r => ({
        type: r.type,
        passed: r.passed,
        timestamp: r.timestamp,
      })),
      signature: this.generateSignature(),
    };

    console.log('[Liveness] Session completed:', this.currentSession.passed);

    return proof;
  }

  /**
   * Generate HMAC signature for tamper protection
   * TODO: Implement proper HMAC with server-shared secret
   */
  private generateSignature(): string {
    if (!this.currentSession) return '';

    // For now, use a simple hash. In production, use HMAC with shared secret
    const data = JSON.stringify({
      sessionId: this.currentSession.sessionId,
      results: this.currentSession.results,
      endTime: this.currentSession.endTime,
    });

    // Simple hash (replace with proper HMAC in production)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Get session progress
   */
  getSessionProgress(): {
    currentChallenge: number;
    totalChallenges: number;
    passedChallenges: number;
    isComplete: boolean;
  } {
    if (!this.currentSession) {
      return {
        currentChallenge: 0,
        totalChallenges: 0,
        passedChallenges: 0,
        isComplete: false,
      };
    }

    return {
      currentChallenge: this.currentSession.results.length + 1,
      totalChallenges: this.currentSession.challenges.length,
      passedChallenges: this.currentSession.results.filter(r => r.passed).length,
      isComplete: this.currentSession.results.length >= this.currentSession.challenges.length,
    };
  }

  /**
   * Check if session is still valid (not timed out)
   */
  isSessionValid(): boolean {
    if (!this.currentSession) return false;
    return Date.now() - this.currentSession.startTime < CONFIG.SESSION_TIMEOUT;
  }

  /**
   * Get current session
   */
  getSession(): LivenessSession | null {
    return this.currentSession;
  }

  /**
   * Cancel current session
   */
  cancelSession(): void {
    this.currentSession = null;
    this.blinkHistory = [];
    this.headPoseHistory = [];
    this.lastDetectionState = null;
    console.log('[Liveness] Session cancelled');
  }
}

// Export singleton instance
export const livenessDetectionService = new LivenessDetectionService();
