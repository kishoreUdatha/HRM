// Face Recognition Service
// Note: Real face recognition requires @tensorflow/tfjs-node which needs Visual Studio C++ build tools
// This service provides a mock implementation that can be replaced with real face recognition later

import * as path from 'path';
import * as fs from 'fs';

// Interfaces
export interface FaceDetectionResult {
  detected: boolean;
  faceCount: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  quality: number;
  descriptor?: Float32Array;
}

export interface FaceMatchResult {
  status: 'MATCHED' | 'NO_MATCH' | 'NO_FACE' | 'MULTIPLE_FACES' | 'LOW_QUALITY';
  employeeId?: string;
  employeeName?: string;
  confidence?: number;
  message: string;
}

export interface FaceEmbeddingData {
  employeeId: string;
  employeeName: string;
  embedding: number[];
}

// Configuration
const CONFIG = {
  MIN_FACE_SIZE: 0.1,
  MAX_FACE_SIZE: 0.9,
  MIN_DETECTION_CONFIDENCE: 0.5,
  MATCH_THRESHOLD: 0.45,
  HIGH_CONFIDENCE_THRESHOLD: 0.35,
  MIN_QUALITY_SCORE: 0.3,
};

// Try to load face-api.js with tfjs
let faceapi: any = null;
let tf: any = null;
let modelsLoaded = false;

const initializeFaceApi = async (): Promise<boolean> => {
  if (faceapi && modelsLoaded) return true;

  try {
    // Try to load tfjs and face-api
    tf = await import('@tensorflow/tfjs');
    await tf.setBackend('cpu');
    await tf.ready();

    faceapi = await import('@vladmandic/face-api');

    const modelsPath = path.join(__dirname, '../../models');

    if (!fs.existsSync(modelsPath)) {
      console.log('[FaceRecognition] Models directory not found, using mock mode');
      return false;
    }

    const modelFiles = [
      'ssd_mobilenetv1_model-weights_manifest.json',
      'face_landmark_68_model-weights_manifest.json',
      'face_recognition_model-weights_manifest.json',
    ];

    const modelsExist = modelFiles.every(file =>
      fs.existsSync(path.join(modelsPath, file))
    );

    if (!modelsExist) {
      console.log('[FaceRecognition] Model files not found, using mock mode');
      return false;
    }

    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);

    modelsLoaded = true;
    console.log('[FaceRecognition] Real face recognition initialized');
    return true;
  } catch (error: any) {
    console.log('[FaceRecognition] TensorFlow not available, using mock mode:', error.message);
    return false;
  }
};

class FaceRecognitionService {
  private initialized = false;
  private useMockMode = true;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const success = await initializeFaceApi();
    this.useMockMode = !success;
    this.initialized = true;

    if (this.useMockMode) {
      console.log('[FaceRecognition] Running in MOCK mode - face verification will be simulated');
    }
  }

  /**
   * Detect face in an image
   */
  async detectFace(base64Image: string): Promise<FaceDetectionResult> {
    await this.initialize();

    if (this.useMockMode) {
      // Mock detection - always detect a face
      return {
        detected: true,
        faceCount: 1,
        boundingBox: { x: 100, y: 100, width: 200, height: 200 },
        quality: 0.85,
        descriptor: new Float32Array(128).fill(0.5),
      };
    }

    // Real face detection would go here
    return {
      detected: true,
      faceCount: 1,
      quality: 0.85,
    };
  }

  /**
   * Generate face embedding from image
   */
  async generateEmbedding(base64Image: string): Promise<Float32Array | null> {
    await this.initialize();

    if (this.useMockMode) {
      // Return mock embedding
      return new Float32Array(128).fill(0.5);
    }

    const detection = await this.detectFace(base64Image);
    return detection.descriptor || null;
  }

  /**
   * Calculate similarity between embeddings
   */
  calculateSimilarity(embedding1: number[] | Float32Array, embedding2: number[] | Float32Array): number {
    const arr1 = Array.from(embedding1);
    const arr2 = Array.from(embedding2);

    if (arr1.length !== arr2.length) {
      throw new Error('Embeddings must have same length');
    }

    let sumSquares = 0;
    for (let i = 0; i < arr1.length; i++) {
      const diff = arr1[i] - arr2[i];
      sumSquares += diff * diff;
    }
    const distance = Math.sqrt(sumSquares);
    const similarity = Math.max(0, 1 - distance);

    return similarity;
  }

  /**
   * Match face against stored embeddings
   */
  async matchFace(
    base64Image: string,
    storedEmbeddings: FaceEmbeddingData[]
  ): Promise<FaceMatchResult> {
    await this.initialize();

    // If no stored embeddings, return no match
    if (!storedEmbeddings || storedEmbeddings.length === 0) {
      return {
        status: 'NO_MATCH',
        message: 'No enrolled employees found. Please enroll faces first.',
      };
    }

    if (this.useMockMode) {
      // In mock mode, match with the first employee for testing
      const firstEmployee = storedEmbeddings[0];
      return {
        status: 'MATCHED',
        employeeId: firstEmployee.employeeId,
        employeeName: firstEmployee.employeeName,
        confidence: 0.92,
        message: `Face matched: ${firstEmployee.employeeName} (Mock Mode)`,
      };
    }

    // Real face matching
    const detection = await this.detectFace(base64Image);

    if (!detection.detected) {
      return {
        status: 'NO_FACE',
        message: 'No face detected in the image. Please ensure your face is clearly visible.',
      };
    }

    if (detection.faceCount > 1) {
      return {
        status: 'MULTIPLE_FACES',
        message: 'Multiple faces detected. Please ensure only one person is in the frame.',
      };
    }

    if (detection.quality < CONFIG.MIN_QUALITY_SCORE) {
      return {
        status: 'LOW_QUALITY',
        message: 'Image quality is too low. Please ensure good lighting and face the camera directly.',
      };
    }

    // Find best match
    let bestMatch: { employeeId: string; employeeName: string; distance: number } | null = null;

    for (const stored of storedEmbeddings) {
      let sumSquares = 0;
      const inputDescriptor = detection.descriptor ? Array.from(detection.descriptor) : [];

      for (let i = 0; i < inputDescriptor.length && i < stored.embedding.length; i++) {
        const diff = inputDescriptor[i] - stored.embedding[i];
        sumSquares += diff * diff;
      }
      const distance = Math.sqrt(sumSquares);

      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = {
          employeeId: stored.employeeId,
          employeeName: stored.employeeName,
          distance,
        };
      }
    }

    if (!bestMatch || bestMatch.distance > CONFIG.MATCH_THRESHOLD) {
      return {
        status: 'NO_MATCH',
        message: 'Face not recognized. Please ensure you are enrolled in the system.',
      };
    }

    const confidence = Math.max(0, Math.min(1, 1 - (bestMatch.distance / CONFIG.MATCH_THRESHOLD) * 0.5));

    return {
      status: 'MATCHED',
      employeeId: bestMatch.employeeId,
      employeeName: bestMatch.employeeName,
      confidence,
      message: `Face matched: ${bestMatch.employeeName}`,
    };
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isMockMode(): boolean {
    return this.useMockMode;
  }
}

// Export singleton instance
export const faceRecognitionService = new FaceRecognitionService();
