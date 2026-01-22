// Face Recognition Service using TensorFlow.js and face-api.js
// Production-ready implementation with vector database integration
// Note: Canvas is optional - service will run in mock mode without it

import * as path from 'path';
import * as fs from 'fs';
import {
  decodeBase64Image,
  analyzeImageQuality,
  normalizeEmbedding,
  averageEmbeddings,
  euclideanDistance,
  cosineSimilarity,
} from '../utils/imageProcessing';
import { vectorDatabaseService } from './vectorDatabaseService';

// Canvas is optional - only loaded when available (requires native build tools)
let createCanvas: any = null;
let loadImage: any = null;
let Canvas: any = null;
let Image: any = null;
let canvasAvailable = false;

// Try to load canvas (may fail on Windows without build tools)
try {
  const canvasModule = require('canvas');
  createCanvas = canvasModule.createCanvas;
  loadImage = canvasModule.loadImage;
  Canvas = canvasModule.Canvas;
  Image = canvasModule.Image;
  canvasAvailable = true;
  console.log('[FaceRecognition] Canvas module loaded successfully');
} catch (error: any) {
  console.log('[FaceRecognition] Canvas not available:', error.message);
  console.log('[FaceRecognition] Face recognition will run in MOCK mode');
}

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
  landmarks?: Array<{ x: number; y: number }>;
}

export interface FaceMatchResult {
  status: 'MATCHED' | 'NO_MATCH' | 'NO_FACE' | 'MULTIPLE_FACES' | 'LOW_QUALITY' | 'LIVENESS_FAILED';
  employeeId?: string;
  employeeName?: string;
  confidence?: number;
  message: string;
  matchDetails?: {
    distance: number;
    threshold: number;
    searchTimeMs: number;
    method: 'vector_db' | 'memory';
  };
}

export interface FaceEmbeddingData {
  employeeId: string;
  employeeName: string;
  embedding: number[];
}

export interface EnrollmentResult {
  success: boolean;
  employeeId: string;
  employeeName?: string;
  enrolledImages: number;
  qualityScores: number[];
  averageQuality: number;
  message: string;
  errors?: Array<{
    imageIndex: number;
    error: string;
  }>;
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

// Configuration
const CONFIG = {
  // Face detection settings
  MIN_FACE_SIZE: 0.1,
  MAX_FACE_SIZE: 0.9,
  MIN_DETECTION_CONFIDENCE: 0.5,

  // Matching thresholds
  MATCH_THRESHOLD: 0.45, // Euclidean distance threshold
  HIGH_CONFIDENCE_THRESHOLD: 0.35,
  COSINE_SIMILARITY_THRESHOLD: 0.7, // For vector DB search

  // Quality settings
  MIN_QUALITY_SCORE: 0.3,
  MIN_IMAGES_FOR_ENROLLMENT: 1,
  RECOMMENDED_IMAGES_FOR_ENROLLMENT: 3,

  // Model paths
  MODELS_PATH: path.join(__dirname, '../../models'),

  // Embedding dimension (face-api.js uses 128)
  EMBEDDING_DIMENSION: 128,

  // Liveness settings
  LIVENESS_SESSION_TIMEOUT_MS: 60000, // 1 minute
  LIVENESS_MIN_CHALLENGES: 2,
};

// TensorFlow and face-api lazy loading
let faceapi: any = null;
let tf: any = null;
let modelsLoaded = false;
let modelLoadingPromise: Promise<boolean> | null = null;

/**
 * Initialize TensorFlow.js and face-api.js models
 */
const initializeFaceApi = async (): Promise<boolean> => {
  if (faceapi && modelsLoaded) return true;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = _doInitialize();
  return modelLoadingPromise;
};

const _doInitialize = async (): Promise<boolean> => {
  try {
    // Check if canvas is available (required for real face recognition)
    if (!canvasAvailable) {
      console.log('[FaceRecognition] Canvas not available - using mock mode');
      return false;
    }

    console.log('[FaceRecognition] Initializing TensorFlow.js and face-api.js...');

    // Import TensorFlow.js
    tf = await import('@tensorflow/tfjs');

    // Set backend to CPU (Node.js compatible)
    await tf.setBackend('cpu');
    await tf.ready();
    console.log(`[FaceRecognition] TensorFlow backend: ${tf.getBackend()}`);

    // Import face-api.js
    faceapi = await import('@vladmandic/face-api');

    // Patch face-api to use node-canvas
    const canvas = { Canvas, Image };
    faceapi.env.monkeyPatch(canvas as any);

    // Check if models directory exists
    if (!fs.existsSync(CONFIG.MODELS_PATH)) {
      console.log(`[FaceRecognition] Models directory not found: ${CONFIG.MODELS_PATH}`);
      console.log('[FaceRecognition] Please download models from: https://github.com/vladmandic/face-api/tree/master/model');
      return false;
    }

    // Check for required model files
    const requiredModels = [
      'ssd_mobilenetv1_model-weights_manifest.json',
      'face_landmark_68_model-weights_manifest.json',
      'face_recognition_model-weights_manifest.json',
    ];

    const missingModels = requiredModels.filter(
      (model) => !fs.existsSync(path.join(CONFIG.MODELS_PATH, model))
    );

    if (missingModels.length > 0) {
      console.log('[FaceRecognition] Missing model files:', missingModels);
      return false;
    }

    // Load models from disk
    console.log('[FaceRecognition] Loading face detection models...');
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromDisk(CONFIG.MODELS_PATH),
      faceapi.nets.faceLandmark68Net.loadFromDisk(CONFIG.MODELS_PATH),
      faceapi.nets.faceRecognitionNet.loadFromDisk(CONFIG.MODELS_PATH),
    ]);

    modelsLoaded = true;
    console.log('[FaceRecognition] All models loaded successfully');

    // Warm up the model with a dummy inference
    await warmUpModel();

    return true;
  } catch (error: any) {
    console.error('[FaceRecognition] Failed to initialize:', error.message);
    return false;
  }
};

/**
 * Warm up the model with a dummy inference to reduce first-request latency
 */
const warmUpModel = async (): Promise<void> => {
  if (!canvasAvailable || !createCanvas) {
    return;
  }

  try {
    console.log('[FaceRecognition] Warming up model...');
    const dummyCanvas = createCanvas(100, 100);
    const ctx = dummyCanvas.getContext('2d');
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 100, 100);

    await faceapi.detectSingleFace(dummyCanvas as any);
    console.log('[FaceRecognition] Model warm-up complete');
  } catch (error) {
    // Ignore warm-up errors
  }
};

/**
 * Face Recognition Service Class
 */
class FaceRecognitionService {
  private initialized = false;
  private useMockMode = false;
  private vectorDbInitialized = false;

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize face-api
    const faceApiSuccess = await initializeFaceApi();
    this.useMockMode = !faceApiSuccess;

    // Initialize vector database
    try {
      await vectorDatabaseService.initialize();
      this.vectorDbInitialized = vectorDatabaseService.isAvailable();
      console.log(`[FaceRecognition] Vector DB available: ${this.vectorDbInitialized}`);
    } catch (error) {
      console.log('[FaceRecognition] Vector DB not available, using fallback');
      this.vectorDbInitialized = false;
    }

    this.initialized = true;

    if (this.useMockMode) {
      console.log('[FaceRecognition] Running in MOCK mode - face verification will be simulated');
    } else {
      console.log('[FaceRecognition] Running in PRODUCTION mode with real face recognition');
    }
  }

  /**
   * Detect face in an image and return detection result
   */
  async detectFace(base64Image: string): Promise<FaceDetectionResult> {
    await this.initialize();

    if (this.useMockMode) {
      return this.mockDetectFace();
    }

    try {
      // Decode and load image
      const imageBuffer = decodeBase64Image(base64Image);
      const img = await loadImage(imageBuffer);

      // Create canvas from image
      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Detect all faces
      const detections = await faceapi
        .detectAllFaces(canvas as any, new faceapi.SsdMobilenetv1Options({
          minConfidence: CONFIG.MIN_DETECTION_CONFIDENCE,
        }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length === 0) {
        return {
          detected: false,
          faceCount: 0,
          quality: 0,
        };
      }

      // Get the largest/most prominent face
      const detection = detections.reduce((best: any, current: any) => {
        const bestArea = best.detection.box.width * best.detection.box.height;
        const currentArea = current.detection.box.width * current.detection.box.height;
        return currentArea > bestArea ? current : best;
      });

      const box = detection.detection.box;
      const imgArea = img.width * img.height;
      const faceArea = box.width * box.height;
      const faceRatio = faceArea / imgArea;

      // Check face size constraints
      if (faceRatio < CONFIG.MIN_FACE_SIZE || faceRatio > CONFIG.MAX_FACE_SIZE) {
        return {
          detected: true,
          faceCount: detections.length,
          boundingBox: {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
          },
          quality: detection.detection.score * 0.5, // Reduce quality for bad face size
        };
      }

      return {
        detected: true,
        faceCount: detections.length,
        boundingBox: {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        },
        quality: detection.detection.score,
        descriptor: detection.descriptor,
        landmarks: detection.landmarks.positions.map((p: any) => ({ x: p.x, y: p.y })),
      };
    } catch (error: any) {
      console.error('[FaceRecognition] Error detecting face:', error.message);
      return {
        detected: false,
        faceCount: 0,
        quality: 0,
      };
    }
  }

  /**
   * Mock face detection for development
   */
  private mockDetectFace(): FaceDetectionResult {
    return {
      detected: true,
      faceCount: 1,
      boundingBox: { x: 100, y: 100, width: 200, height: 200 },
      quality: 0.85,
      descriptor: new Float32Array(CONFIG.EMBEDDING_DIMENSION).fill(0.5),
    };
  }

  /**
   * Generate face embedding from image
   */
  async generateEmbedding(base64Image: string): Promise<Float32Array | null> {
    await this.initialize();

    if (this.useMockMode) {
      // Return deterministic mock embedding based on image hash
      const hash = base64Image.length % 1000;
      const embedding = new Float32Array(CONFIG.EMBEDDING_DIMENSION);
      for (let i = 0; i < CONFIG.EMBEDDING_DIMENSION; i++) {
        embedding[i] = Math.sin(hash + i) * 0.5 + 0.5;
      }
      return embedding;
    }

    const detection = await this.detectFace(base64Image);
    if (!detection.detected || !detection.descriptor) {
      return null;
    }
    return detection.descriptor;
  }

  /**
   * Enroll a face with multiple images
   */
  async enrollFace(params: {
    tenantId: string;
    employeeId: string;
    employeeName: string;
    images: string[];
    livenessProof?: LivenessProof;
  }): Promise<EnrollmentResult> {
    await this.initialize();

    const { tenantId, employeeId, employeeName, images, livenessProof } = params;

    // Validate liveness if provided
    if (livenessProof && !this.validateLivenessProof(livenessProof)) {
      return {
        success: false,
        employeeId,
        enrolledImages: 0,
        qualityScores: [],
        averageQuality: 0,
        message: 'Liveness verification failed',
      };
    }

    if (images.length < CONFIG.MIN_IMAGES_FOR_ENROLLMENT) {
      return {
        success: false,
        employeeId,
        enrolledImages: 0,
        qualityScores: [],
        averageQuality: 0,
        message: `At least ${CONFIG.MIN_IMAGES_FOR_ENROLLMENT} image(s) required for enrollment`,
      };
    }

    const embeddings: number[][] = [];
    const qualityScores: number[] = [];
    const errors: Array<{ imageIndex: number; error: string }> = [];

    // Process each image
    for (let i = 0; i < images.length; i++) {
      try {
        // Analyze image quality
        const quality = await analyzeImageQuality(images[i]);
        if (!quality.isValid && !this.useMockMode) {
          errors.push({
            imageIndex: i,
            error: quality.issues.join('; '),
          });
          continue;
        }

        // Detect face and generate embedding
        const detection = await this.detectFace(images[i]);

        if (!detection.detected) {
          errors.push({ imageIndex: i, error: 'NO_FACE' });
          continue;
        }

        if (detection.faceCount > 1) {
          errors.push({ imageIndex: i, error: 'MULTIPLE_FACES' });
          continue;
        }

        if (detection.quality < CONFIG.MIN_QUALITY_SCORE) {
          errors.push({ imageIndex: i, error: 'LOW_QUALITY' });
          continue;
        }

        if (detection.descriptor) {
          embeddings.push(Array.from(detection.descriptor));
          qualityScores.push(detection.quality);
        }
      } catch (error: any) {
        errors.push({ imageIndex: i, error: error.message });
      }
    }

    if (embeddings.length === 0) {
      return {
        success: false,
        employeeId,
        enrolledImages: 0,
        qualityScores,
        averageQuality: 0,
        message: 'No valid face images could be processed',
        errors,
      };
    }

    // Calculate average embedding
    const averageEmbedding = averageEmbeddings(embeddings);
    const averageQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;

    // Store in vector database
    if (this.vectorDbInitialized) {
      await vectorDatabaseService.upsertEmbedding({
        tenantId,
        employeeId,
        employeeName,
        embedding: averageEmbedding,
      });
    }

    console.log(`[FaceRecognition] Enrolled face for employee ${employeeId} with ${embeddings.length} images`);

    return {
      success: true,
      employeeId,
      employeeName,
      enrolledImages: embeddings.length,
      qualityScores,
      averageQuality,
      message: `Successfully enrolled ${embeddings.length} face image(s)`,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Match face against stored embeddings
   */
  async matchFace(
    base64Image: string,
    storedEmbeddings: FaceEmbeddingData[],
    options?: {
      tenantId?: string;
      hintEmployeeId?: string;
      livenessProof?: LivenessProof;
    }
  ): Promise<FaceMatchResult> {
    await this.initialize();

    const { tenantId, hintEmployeeId, livenessProof } = options || {};

    // Validate liveness if provided
    if (livenessProof && !this.validateLivenessProof(livenessProof)) {
      return {
        status: 'LIVENESS_FAILED',
        message: 'Liveness verification failed. Please try again with proper liveness checks.',
      };
    }

    // Check if we have any enrollments to match against
    if ((!storedEmbeddings || storedEmbeddings.length === 0) && !this.vectorDbInitialized) {
      return {
        status: 'NO_MATCH',
        message: 'No enrolled employees found. Please enroll faces first.',
      };
    }

    // Handle mock mode
    if (this.useMockMode) {
      return this.mockMatchFace(storedEmbeddings, hintEmployeeId);
    }

    // Detect face in input image
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

    const inputEmbedding = Array.from(detection.descriptor!);
    const startTime = Date.now();

    // Try vector database search first (faster for large datasets)
    if (this.vectorDbInitialized && tenantId) {
      const vectorResults = await vectorDatabaseService.searchSimilar({
        tenantId,
        embedding: inputEmbedding,
        limit: 1,
        scoreThreshold: CONFIG.COSINE_SIMILARITY_THRESHOLD,
      });

      if (vectorResults.length > 0) {
        const bestMatch = vectorResults[0];
        const searchTime = Date.now() - startTime;

        return {
          status: 'MATCHED',
          employeeId: bestMatch.employeeId,
          employeeName: bestMatch.employeeName,
          confidence: bestMatch.score,
          message: `Face matched: ${bestMatch.employeeName}`,
          matchDetails: {
            distance: bestMatch.distance,
            threshold: CONFIG.COSINE_SIMILARITY_THRESHOLD,
            searchTimeMs: searchTime,
            method: 'vector_db',
          },
        };
      }
    }

    // Fallback to memory-based search with stored embeddings
    if (storedEmbeddings && storedEmbeddings.length > 0) {
      let bestMatch: { employeeId: string; employeeName: string; distance: number } | null = null;

      for (const stored of storedEmbeddings) {
        const distance = euclideanDistance(inputEmbedding, stored.embedding);

        if (!bestMatch || distance < bestMatch.distance) {
          bestMatch = {
            employeeId: stored.employeeId,
            employeeName: stored.employeeName,
            distance,
          };
        }
      }

      const searchTime = Date.now() - startTime;

      if (bestMatch && bestMatch.distance <= CONFIG.MATCH_THRESHOLD) {
        const confidence = Math.max(0, Math.min(1, 1 - (bestMatch.distance / CONFIG.MATCH_THRESHOLD)));

        return {
          status: 'MATCHED',
          employeeId: bestMatch.employeeId,
          employeeName: bestMatch.employeeName,
          confidence,
          message: `Face matched: ${bestMatch.employeeName}`,
          matchDetails: {
            distance: bestMatch.distance,
            threshold: CONFIG.MATCH_THRESHOLD,
            searchTimeMs: searchTime,
            method: 'memory',
          },
        };
      }
    }

    return {
      status: 'NO_MATCH',
      message: 'Face not recognized. Please ensure you are enrolled in the system.',
    };
  }

  /**
   * Mock face matching for development
   */
  private mockMatchFace(
    storedEmbeddings: FaceEmbeddingData[],
    hintEmployeeId?: string
  ): FaceMatchResult {
    console.log('[FaceRecognition] Mock mode: hintEmployeeId:', hintEmployeeId);

    // Use hint employee if provided and enrolled
    if (hintEmployeeId) {
      const hintedEmployee = storedEmbeddings.find((e) => e.employeeId === hintEmployeeId);
      if (hintedEmployee) {
        return {
          status: 'MATCHED',
          employeeId: hintedEmployee.employeeId,
          employeeName: hintedEmployee.employeeName,
          confidence: 0.92,
          message: `Face matched: ${hintedEmployee.employeeName} (Mock Mode)`,
          matchDetails: {
            distance: 0.15,
            threshold: CONFIG.MATCH_THRESHOLD,
            searchTimeMs: 5,
            method: 'memory',
          },
        };
      } else {
        // Employee not enrolled but hint provided - use for mock testing
        return {
          status: 'MATCHED',
          employeeId: hintEmployeeId,
          employeeName: 'Verified Employee',
          confidence: 0.92,
          message: `Face matched (Mock Mode - Not Enrolled)`,
          matchDetails: {
            distance: 0.15,
            threshold: CONFIG.MATCH_THRESHOLD,
            searchTimeMs: 5,
            method: 'memory',
          },
        };
      }
    }

    // No hint - use first enrolled employee
    if (storedEmbeddings.length > 0) {
      const matched = storedEmbeddings[0];
      return {
        status: 'MATCHED',
        employeeId: matched.employeeId,
        employeeName: matched.employeeName,
        confidence: 0.92,
        message: `Face matched: ${matched.employeeName} (Mock Mode)`,
        matchDetails: {
          distance: 0.15,
          threshold: CONFIG.MATCH_THRESHOLD,
          searchTimeMs: 5,
          method: 'memory',
        },
      };
    }

    return {
      status: 'NO_MATCH',
      message: 'No enrolled employees found (Mock Mode)',
    };
  }

  /**
   * Validate liveness proof from mobile app
   */
  validateLivenessProof(proof: LivenessProof): boolean {
    if (!proof || !proof.sessionId || !proof.challenges) {
      return false;
    }

    // Check minimum challenges passed
    const passedChallenges = proof.challenges.filter((c) => c.passed);
    if (passedChallenges.length < CONFIG.LIVENESS_MIN_CHALLENGES) {
      console.log('[FaceRecognition] Liveness failed: insufficient challenges passed');
      return false;
    }

    // Check timestamps are recent
    const now = Date.now();
    const oldestChallenge = Math.min(...proof.challenges.map((c) => c.timestamp));
    if (now - oldestChallenge > CONFIG.LIVENESS_SESSION_TIMEOUT_MS) {
      console.log('[FaceRecognition] Liveness failed: session expired');
      return false;
    }

    // TODO: Validate HMAC signature when implemented
    // For now, accept if challenges are valid

    return true;
  }

  /**
   * Calculate similarity between two embeddings
   */
  calculateSimilarity(
    embedding1: number[] | Float32Array,
    embedding2: number[] | Float32Array
  ): number {
    const arr1 = Array.from(embedding1);
    const arr2 = Array.from(embedding2);
    return cosineSimilarity(arr1, arr2);
  }

  /**
   * Delete enrollment for an employee
   */
  async deleteEnrollment(tenantId: string, employeeId: string): Promise<boolean> {
    if (this.vectorDbInitialized) {
      return await vectorDatabaseService.deleteEmbedding(tenantId, employeeId);
    }
    return false;
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean;
    mockMode: boolean;
    vectorDbAvailable: boolean;
    modelsLoaded: boolean;
  } {
    return {
      initialized: this.initialized,
      mockMode: this.useMockMode,
      vectorDbAvailable: this.vectorDbInitialized,
      modelsLoaded,
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
