import * as ImageManipulator from "expo-image-manipulator";
import { Logger } from "../services/logger";

export interface ImageOptimizeOptions {
  maxWidth?: number;
  quality?: number; // 0-1
}

const DEFAULT_OPTIONS: ImageOptimizeOptions = {
  maxWidth: 1024,
  quality: 0.7,
};

/**
 * Optimize image for upload - reduces size and quality
 * @param uri - Image URI to optimize
 * @param options - Optimization options
 * @returns Optimized image URI
 */
export async function optimizeImage(
  uri: string,
  options: ImageOptimizeOptions = {}
): Promise<string> {
  const { maxWidth, quality } = { ...DEFAULT_OPTIONS, ...options };

  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    Logger.info("ImageUtils", "Optimized image:", {
      original: uri.substring(0, 50) + "...",
      optimized: result.uri.substring(0, 50) + "...",
      width: result.width,
      height: result.height,
    });

    return result.uri;
  } catch (error) {
    Logger.error("ImageUtils", "Failed to optimize image:", error);
    return uri;
  }
}

/**
 * Optimize image for OCR - higher quality for text recognition
 */
export async function optimizeImageForOCR(uri: string): Promise<string> {
  return optimizeImage(uri, {
    maxWidth: 1920,
    quality: 0.85,
  });
}

/**
 * Optimize image for object detection - lower quality is fine
 */
export async function optimizeImageForDetection(uri: string): Promise<string> {
  return optimizeImage(uri, {
    maxWidth: 640,
    quality: 0.6,
  });
}
