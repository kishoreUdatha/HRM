// Image Processing Utilities for Face Recognition
import { Jimp } from 'jimp';

// Interfaces
export interface ImageQualityResult {
  isValid: boolean;
  width: number;
  height: number;
  brightness: number;
  contrast: number;
  blurScore: number;
  issues: string[];
}

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  mimeType: string;
}

// Configuration
const CONFIG = {
  MAX_WIDTH: 640,
  MAX_HEIGHT: 480,
  MIN_WIDTH: 100,
  MIN_HEIGHT: 100,
  MIN_BRIGHTNESS: 40,
  MAX_BRIGHTNESS: 220,
  MIN_BLUR_SCORE: 50, // Higher = sharper
  JPEG_QUALITY: 85,
};

/**
 * Decode base64 image to buffer
 */
export function decodeBase64Image(base64Image: string): Buffer {
  // Remove data URL prefix if present
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

/**
 * Encode buffer to base64 string
 */
export function encodeToBase64(buffer: Buffer, mimeType: string = 'image/jpeg'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Preprocess image for face recognition
 * - Resize to max dimensions while maintaining aspect ratio
 * - Normalize brightness/contrast
 * - Convert to JPEG
 */
export async function preprocessImage(base64Image: string): Promise<ProcessedImage> {
  try {
    const imageBuffer = decodeBase64Image(base64Image);
    const image = await Jimp.read(imageBuffer);

    // Get original dimensions (Jimp v1.x uses properties not methods)
    const originalWidth = image.width;
    const originalHeight = image.height;

    // Resize if too large (maintain aspect ratio)
    if (originalWidth > CONFIG.MAX_WIDTH || originalHeight > CONFIG.MAX_HEIGHT) {
      image.scaleToFit({ w: CONFIG.MAX_WIDTH, h: CONFIG.MAX_HEIGHT });
    }

    // Normalize brightness and contrast
    image.normalize();

    // Get processed buffer
    const processedBuffer = await image.getBuffer('image/jpeg');

    return {
      buffer: processedBuffer,
      width: image.width,
      height: image.height,
      mimeType: 'image/jpeg',
    };
  } catch (error: any) {
    console.error('[ImageProcessing] Error preprocessing image:', error.message);
    throw new Error(`Failed to preprocess image: ${error.message}`);
  }
}

/**
 * Analyze image quality for face recognition suitability
 */
export async function analyzeImageQuality(base64Image: string): Promise<ImageQualityResult> {
  const issues: string[] = [];

  try {
    const imageBuffer = decodeBase64Image(base64Image);
    const image = await Jimp.read(imageBuffer);

    const width = image.width;
    const height = image.height;

    // Check dimensions
    if (width < CONFIG.MIN_WIDTH || height < CONFIG.MIN_HEIGHT) {
      issues.push(`Image too small: ${width}x${height}, minimum ${CONFIG.MIN_WIDTH}x${CONFIG.MIN_HEIGHT}`);
    }

    // Calculate average brightness
    let totalBrightness = 0;
    let pixelCount = 0;
    let brightnessVariance = 0;
    const brightnessValues: number[] = [];

    // Sample pixels (every 10th pixel for performance)
    image.scan((x: number, y: number, idx: number) => {
      if (x % 10 === 0 && y % 10 === 0) {
        const red = image.bitmap.data[idx];
        const green = image.bitmap.data[idx + 1];
        const blue = image.bitmap.data[idx + 2];
        // Calculate perceived brightness (human eye weighted)
        const brightness = 0.299 * red + 0.587 * green + 0.114 * blue;
        brightnessValues.push(brightness);
        totalBrightness += brightness;
        pixelCount++;
      }
    });

    const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 128;

    // Calculate contrast (standard deviation of brightness)
    if (brightnessValues.length > 0) {
      const variance = brightnessValues.reduce((sum, val) => sum + Math.pow(val - avgBrightness, 2), 0) / brightnessValues.length;
      brightnessVariance = Math.sqrt(variance);
    }

    // Check brightness
    if (avgBrightness < CONFIG.MIN_BRIGHTNESS) {
      issues.push(`Image too dark: brightness ${avgBrightness.toFixed(0)}, minimum ${CONFIG.MIN_BRIGHTNESS}`);
    }
    if (avgBrightness > CONFIG.MAX_BRIGHTNESS) {
      issues.push(`Image too bright/overexposed: brightness ${avgBrightness.toFixed(0)}, maximum ${CONFIG.MAX_BRIGHTNESS}`);
    }

    // Estimate blur using Laplacian variance approximation
    // We'll use edge detection as a proxy for sharpness
    const blurScore = await estimateBlurScore(image);
    if (blurScore < CONFIG.MIN_BLUR_SCORE) {
      issues.push(`Image appears blurry: sharpness score ${blurScore.toFixed(0)}, minimum ${CONFIG.MIN_BLUR_SCORE}`);
    }

    return {
      isValid: issues.length === 0,
      width,
      height,
      brightness: avgBrightness,
      contrast: brightnessVariance,
      blurScore,
      issues,
    };
  } catch (error: any) {
    console.error('[ImageProcessing] Error analyzing image quality:', error.message);
    return {
      isValid: false,
      width: 0,
      height: 0,
      brightness: 0,
      contrast: 0,
      blurScore: 0,
      issues: [`Failed to analyze image: ${error.message}`],
    };
  }
}

/**
 * Estimate blur score using edge detection variance
 * Higher score = sharper image
 */
async function estimateBlurScore(image: any): Promise<number> {
  // Create a grayscale copy (Jimp v1.x uses British spelling)
  const gray = image.clone().greyscale();
  const width = gray.width;
  const height = gray.height;

  // Simple Laplacian kernel approximation
  // Calculate variance of edge responses
  let edgeSum = 0;
  let edgeSumSq = 0;
  let count = 0;

  // Use scanIterator for Jimp v1.x
  for (const { x, y, idx } of gray.scanIterator(1, 1, width - 2, height - 2)) {
    // Only sample every 5th pixel for performance
    if (x % 5 !== 0 || y % 5 !== 0) continue;

    // Get surrounding pixel values
    const center = gray.bitmap.data[idx];
    const top = gray.bitmap.data[idx - width * 4];
    const bottom = gray.bitmap.data[idx + width * 4];
    const left = gray.bitmap.data[idx - 4];
    const right = gray.bitmap.data[idx + 4];

    // Laplacian approximation: center * 4 - top - bottom - left - right
    const laplacian = Math.abs(center * 4 - top - bottom - left - right);

    edgeSum += laplacian;
    edgeSumSq += laplacian * laplacian;
    count++;
  }

  if (count === 0) return 0;

  // Calculate variance
  const mean = edgeSum / count;
  const variance = (edgeSumSq / count) - (mean * mean);

  // Return variance as blur score (higher = sharper)
  return Math.sqrt(Math.max(0, variance));
}

/**
 * Convert image to tensor-compatible format
 * Returns the image as a Buffer that can be loaded by face-api
 */
export async function toTensorBuffer(base64Image: string): Promise<Buffer> {
  const imageBuffer = decodeBase64Image(base64Image);
  const image = await Jimp.read(imageBuffer);

  // Resize if needed
  if (image.width > CONFIG.MAX_WIDTH || image.height > CONFIG.MAX_HEIGHT) {
    image.scaleToFit({ w: CONFIG.MAX_WIDTH, h: CONFIG.MAX_HEIGHT });
  }

  return await image.getBuffer('image/jpeg');
}

/**
 * Normalize a face embedding vector
 */
export function normalizeEmbedding(embedding: number[]): number[] {
  // L2 normalization
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return embedding;
  return embedding.map(val => val / magnitude);
}

/**
 * Calculate average of multiple embeddings
 */
export function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];
  if (embeddings.length === 1) return normalizeEmbedding(embeddings[0]);

  const dimension = embeddings[0].length;
  const average: number[] = new Array(dimension).fill(0);

  for (const embedding of embeddings) {
    for (let i = 0; i < dimension; i++) {
      average[i] += embedding[i];
    }
  }

  for (let i = 0; i < dimension; i++) {
    average[i] /= embeddings.length;
  }

  return normalizeEmbedding(average);
}

/**
 * Calculate Euclidean distance between two embeddings
 */
export function euclideanDistance(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have same dimension');
  }

  let sumSquares = 0;
  for (let i = 0; i < embedding1.length; i++) {
    const diff = embedding1[i] - embedding2[i];
    sumSquares += diff * diff;
  }
  return Math.sqrt(sumSquares);
}

/**
 * Calculate Cosine similarity between two embeddings
 */
export function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have same dimension');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}
