// Face Quality Service for Mobile Face Recognition
// Validates image quality before sending to server

// Types
export interface FaceQualityResult {
  isValid: boolean;
  faceDetected: boolean;
  faceCount: number;
  faceSize: number; // Relative to frame (0-1)
  faceCentered: boolean;
  brightness: 'too_dark' | 'good' | 'too_bright';
  brightnessValue: number; // 0-255
  blur: 'blurry' | 'good';
  blurScore: number;
  faceAngle: {
    pitch: number;
    yaw: number;
    roll: number;
  };
  issues: string[];
  recommendations: string[];
}

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface QualityCheckConfig {
  minFaceSize: number;
  maxFaceSize: number;
  minBrightness: number;
  maxBrightness: number;
  minBlurScore: number;
  maxHeadAngle: number;
  centerTolerance: number;
}

// Default configuration
const DEFAULT_CONFIG: QualityCheckConfig = {
  minFaceSize: 0.15, // 15% of frame
  maxFaceSize: 0.85, // 85% of frame
  minBrightness: 60,
  maxBrightness: 220,
  minBlurScore: 50,
  maxHeadAngle: 30, // degrees
  centerTolerance: 0.25, // 25% from center
};

// Quality messages
const QUALITY_MESSAGES = {
  NO_FACE: 'No face detected in the frame',
  MULTIPLE_FACES: 'Multiple faces detected. Please ensure only one person is visible',
  FACE_TOO_SMALL: 'Move closer to the camera',
  FACE_TOO_LARGE: 'Move further from the camera',
  FACE_NOT_CENTERED: 'Center your face in the frame',
  TOO_DARK: 'Lighting is too dark. Please find better lighting',
  TOO_BRIGHT: 'Lighting is too bright or overexposed',
  BLURRY: 'Image is blurry. Please hold the camera steady',
  HEAD_TILTED: 'Please face the camera directly',
};

class FaceQualityService {
  private config: QualityCheckConfig;
  private lastResult: FaceQualityResult | null = null;

  constructor(config: Partial<QualityCheckConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate face quality from detection results
   */
  validateFaceQuality(params: {
    faceDetected: boolean;
    faceCount: number;
    boundingBox?: FaceBoundingBox;
    frameWidth: number;
    frameHeight: number;
    brightness?: number;
    blurScore?: number;
    headPose?: { pitch: number; yaw: number; roll: number };
  }): FaceQualityResult {
    const {
      faceDetected,
      faceCount,
      boundingBox,
      frameWidth,
      frameHeight,
      brightness = 128,
      blurScore = 100,
      headPose = { pitch: 0, yaw: 0, roll: 0 },
    } = params;

    const issues: string[] = [];
    const recommendations: string[] = [];
    let isValid = true;

    // Check face detection
    if (!faceDetected || faceCount === 0) {
      issues.push(QUALITY_MESSAGES.NO_FACE);
      recommendations.push('Position your face in the oval guide');
      isValid = false;
    }

    if (faceCount > 1) {
      issues.push(QUALITY_MESSAGES.MULTIPLE_FACES);
      recommendations.push('Ensure only one person is in the frame');
      isValid = false;
    }

    // Calculate face size
    let faceSize = 0;
    let faceCentered = false;

    if (boundingBox && frameWidth > 0 && frameHeight > 0) {
      const faceArea = boundingBox.width * boundingBox.height;
      const frameArea = frameWidth * frameHeight;
      faceSize = faceArea / frameArea;

      // Check face size
      if (faceSize < this.config.minFaceSize) {
        issues.push(QUALITY_MESSAGES.FACE_TOO_SMALL);
        recommendations.push('Move closer to the camera');
        isValid = false;
      } else if (faceSize > this.config.maxFaceSize) {
        issues.push(QUALITY_MESSAGES.FACE_TOO_LARGE);
        recommendations.push('Move back from the camera');
        isValid = false;
      }

      // Check if face is centered
      const faceCenterX = boundingBox.x + boundingBox.width / 2;
      const faceCenterY = boundingBox.y + boundingBox.height / 2;
      const frameCenterX = frameWidth / 2;
      const frameCenterY = frameHeight / 2;

      const xOffset = Math.abs(faceCenterX - frameCenterX) / frameWidth;
      const yOffset = Math.abs(faceCenterY - frameCenterY) / frameHeight;

      faceCentered = xOffset <= this.config.centerTolerance && yOffset <= this.config.centerTolerance;

      if (!faceCentered) {
        issues.push(QUALITY_MESSAGES.FACE_NOT_CENTERED);
        if (faceCenterX < frameCenterX) {
          recommendations.push('Move your face slightly right');
        } else {
          recommendations.push('Move your face slightly left');
        }
      }
    }

    // Check brightness
    let brightnessStatus: 'too_dark' | 'good' | 'too_bright' = 'good';
    if (brightness < this.config.minBrightness) {
      brightnessStatus = 'too_dark';
      issues.push(QUALITY_MESSAGES.TOO_DARK);
      recommendations.push('Find better lighting or turn on a light');
      isValid = false;
    } else if (brightness > this.config.maxBrightness) {
      brightnessStatus = 'too_bright';
      issues.push(QUALITY_MESSAGES.TOO_BRIGHT);
      recommendations.push('Reduce lighting or move away from bright lights');
      isValid = false;
    }

    // Check blur
    let blurStatus: 'blurry' | 'good' = 'good';
    if (blurScore < this.config.minBlurScore) {
      blurStatus = 'blurry';
      issues.push(QUALITY_MESSAGES.BLURRY);
      recommendations.push('Hold your device steady');
      isValid = false;
    }

    // Check head angle
    const maxAngle = Math.max(
      Math.abs(headPose.pitch),
      Math.abs(headPose.yaw),
      Math.abs(headPose.roll)
    );

    if (maxAngle > this.config.maxHeadAngle) {
      issues.push(QUALITY_MESSAGES.HEAD_TILTED);
      recommendations.push('Face the camera directly');
      isValid = false;
    }

    const result: FaceQualityResult = {
      isValid,
      faceDetected,
      faceCount,
      faceSize,
      faceCentered,
      brightness: brightnessStatus,
      brightnessValue: brightness,
      blur: blurStatus,
      blurScore,
      faceAngle: headPose,
      issues,
      recommendations,
    };

    this.lastResult = result;
    return result;
  }

  /**
   * Get quality score (0-100)
   */
  getQualityScore(result: FaceQualityResult): number {
    if (!result.faceDetected) return 0;
    if (result.faceCount !== 1) return 0;

    let score = 100;

    // Face size penalty
    if (result.faceSize < this.config.minFaceSize) {
      score -= 30;
    } else if (result.faceSize > this.config.maxFaceSize) {
      score -= 20;
    }

    // Centering penalty
    if (!result.faceCentered) {
      score -= 15;
    }

    // Brightness penalty
    if (result.brightness !== 'good') {
      score -= 20;
    }

    // Blur penalty
    if (result.blur === 'blurry') {
      score -= 25;
    }

    // Head angle penalty
    const maxAngle = Math.max(
      Math.abs(result.faceAngle.pitch),
      Math.abs(result.faceAngle.yaw),
      Math.abs(result.faceAngle.roll)
    );
    if (maxAngle > this.config.maxHeadAngle) {
      score -= 20;
    } else if (maxAngle > this.config.maxHeadAngle / 2) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get primary recommendation for user feedback
   */
  getPrimaryRecommendation(result: FaceQualityResult): string | null {
    if (result.recommendations.length === 0) return null;
    return result.recommendations[0];
  }

  /**
   * Get quality status for UI display
   */
  getQualityStatus(result: FaceQualityResult): 'good' | 'warning' | 'error' {
    if (result.isValid) return 'good';
    if (result.faceDetected && result.faceCount === 1) return 'warning';
    return 'error';
  }

  /**
   * Get quality color for UI
   */
  getQualityColor(result: FaceQualityResult): string {
    const status = this.getQualityStatus(result);
    switch (status) {
      case 'good':
        return '#22C55E'; // Green
      case 'warning':
        return '#F59E0B'; // Yellow/Orange
      case 'error':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  }

  /**
   * Check if quality is good enough for capture
   */
  isReadyForCapture(result?: FaceQualityResult): boolean {
    const r = result || this.lastResult;
    if (!r) return false;
    return r.isValid;
  }

  /**
   * Get last quality result
   */
  getLastResult(): FaceQualityResult | null {
    return this.lastResult;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<QualityCheckConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Reset to default configuration
   */
  resetConfig(): void {
    this.config = { ...DEFAULT_CONFIG };
  }
}

// Export singleton instance with default config
export const faceQualityService = new FaceQualityService();

// Export class for custom instances
export { FaceQualityService };
