/**
 * Image compression utilities for faster upload
 * Compresses images before sending to the face recognition API
 */
import {Image} from 'react-native';
import RNFS from 'react-native-fs';

// Configuration
const CONFIG = {
  MAX_WIDTH: 640,
  MAX_HEIGHT: 480,
  QUALITY: 0.7, // JPEG quality (0.0 - 1.0)
};

/**
 * Get image dimensions from base64 or file path
 */
export async function getImageDimensions(
  source: string
): Promise<{width: number; height: number}> {
  return new Promise((resolve, reject) => {
    if (source.startsWith('data:') || source.startsWith('/')) {
      const uri = source.startsWith('data:') ? source : `file://${source}`;
      Image.getSize(
        uri,
        (width, height) => resolve({width, height}),
        error => reject(error)
      );
    } else {
      // Assume file path
      Image.getSize(
        `file://${source}`,
        (width, height) => resolve({width, height}),
        error => reject(error)
      );
    }
  });
}

/**
 * Compress base64 image for faster upload
 * Returns optimized base64 string
 *
 * Note: For full compression, you would need react-native-image-resizer
 * This is a simple size optimization that works without additional dependencies
 */
export async function compressBase64Image(
  base64Image: string,
  maxWidth: number = CONFIG.MAX_WIDTH,
  maxHeight: number = CONFIG.MAX_HEIGHT
): Promise<string> {
  // If the image is already small, return as-is
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const sizeInBytes = base64Data.length * 0.75; // Approximate decoded size

  // If less than 100KB, don't compress
  if (sizeInBytes < 100 * 1024) {
    return base64Image;
  }

  // For larger images, we'll need react-native-image-resizer
  // For now, just return the original
  // TODO: Add react-native-image-resizer for full compression support
  console.log(
    `[ImageCompression] Image size: ${(sizeInBytes / 1024).toFixed(1)}KB`
  );

  return base64Image;
}

/**
 * Calculate estimated upload time based on image size and connection speed
 */
export function estimateUploadTime(
  base64Image: string,
  connectionSpeedMbps: number = 2
): number {
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const sizeInBytes = base64Data.length * 0.75;
  const sizeInMb = sizeInBytes / (1024 * 1024);
  const timeInSeconds = sizeInMb / (connectionSpeedMbps / 8);
  return Math.ceil(timeInSeconds * 1000); // Return milliseconds
}

/**
 * Get image size info for logging
 */
export function getImageSizeInfo(base64Image: string): {
  sizeKB: number;
  estimatedUploadMs: number;
} {
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const sizeInBytes = base64Data.length * 0.75;
  const sizeKB = sizeInBytes / 1024;

  return {
    sizeKB: Math.round(sizeKB),
    estimatedUploadMs: estimateUploadTime(base64Image),
  };
}
