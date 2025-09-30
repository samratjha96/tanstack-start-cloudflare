import { google } from '@ai-sdk/google';
import { experimental_generateImage as generateImage } from 'ai';
import type {
  AIImageGenerationRequest,
  AIModelConfig,
  APIKeyValidation,
  FileUploadValidation,
  ImageFormat
} from '@/types/ai-image';

/**
 * Configuration for AI image generation using Google's Gemini 2.5 Flash Image Preview model
 */
export const AI_CONFIG: AIModelConfig = {
  model: 'gemini-2.5-flash-image',
  maxImages: 5,
  maxFileSize: 5 * 1024 * 1024, // 5MB in bytes
  supportedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const,
};

/**
 * Validates Google API key format
 * @param apiKey - The Google API key to validate
 * @returns APIKeyValidation object with validation result
 */
export function validateGoogleApiKey(apiKey: string): APIKeyValidation {
  if (typeof apiKey !== 'string') {
    return { isValid: false, error: 'API key must be a string' };
  }

  if (!apiKey.trim()) {
    return { isValid: false, error: 'API key is required' };
  }

  // Google API keys typically start with "AIza" and are 39 characters long
  if (!apiKey.startsWith('AIza')) {
    return { isValid: false, error: 'Google API key must start with "AIza"' };
  }

  if (apiKey.length !== 39) {
    return { isValid: false, error: 'Google API key must be 39 characters long' };
  }

  return { isValid: true };
}

/**
 * Creates a configured Google AI provider instance
 * @param apiKey - The Google API key
 * @returns Configured Google provider
 */
export function createGoogleProvider(apiKey: string) {
  const validation = validateGoogleApiKey(apiKey);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid Google API key format');
  }

  return google({
    apiKey,
  });
}

/**
 * Generates images using Google's Gemini model
 * @param options - Configuration options for image generation
 * @returns Promise with generated image data
 */
export async function generateAIImages(options: Omit<AIImageGenerationRequest, 'count'> & { count?: number }) {
  const { apiKey, prompt, referenceImages = [], count = 1 } = options;

  const validation = validateGoogleApiKey(apiKey);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid Google API key');
  }

  if (count < 1 || count > AI_CONFIG.maxImages) {
    throw new Error(`Image count must be between 1 and ${AI_CONFIG.maxImages}`);
  }

  if (referenceImages.length > AI_CONFIG.maxImages) {
    throw new Error(`Maximum ${AI_CONFIG.maxImages} reference images allowed`);
  }

  // Validate reference images
  for (const file of referenceImages) {
    if (file.size > AI_CONFIG.maxFileSize) {
      throw new Error(`File ${file.name} exceeds maximum size of ${AI_CONFIG.maxFileSize / (1024 * 1024)}MB`);
    }

    if (!AI_CONFIG.supportedFormats.includes(file.type)) {
      throw new Error(`Unsupported file format: ${file.type}`);
    }
  }

  const provider = createGoogleProvider(apiKey);

  try {
    const result = await generateImage({
      model: provider(AI_CONFIG.model),
      prompt,
      n: count,
      // Note: Reference images will be handled in the server function
      // where we can properly convert File objects to the format expected by the AI SDK
    });

    return result;
  } catch (error) {
    if (error instanceof Error) {
      // Handle common API errors
      if (error.message.includes('quota')) {
        throw new Error('API quota exceeded. Please check your Google API usage limits.');
      }
      if (error.message.includes('authentication')) {
        throw new Error('Invalid API key. Please check your Google API key.');
      }
      if (error.message.includes('rate limit')) {
        throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
      }
    }

    throw new Error('Failed to generate images. Please try again.');
  }
}

/**
 * Validates an uploaded file against AI image generation requirements
 * @param file - The file to validate
 * @returns FileUploadValidation object with validation result
 */
export function validateImageFile(file: File): FileUploadValidation {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Check file size
  if (file.size > AI_CONFIG.maxFileSize) {
    const maxSizeMB = AI_CONFIG.maxFileSize / (1024 * 1024);
    return {
      isValid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed size of ${maxSizeMB}MB`
    };
  }

  // Check file type
  if (!AI_CONFIG.supportedFormats.includes(file.type as ImageFormat)) {
    return {
      isValid: false,
      error: `Unsupported file format: ${file.type}. Supported formats: ${AI_CONFIG.supportedFormats.join(', ')}`
    };
  }

  return { isValid: true, file };
}

/**
 * Converts a File object to base64 data URL for AI SDK usage
 * @param file - The file to convert
 * @returns Promise with base64 data URL
 */
export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

