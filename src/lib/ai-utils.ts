import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
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
  model: 'gemini-2.5-flash-image-preview',
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

  return createGoogleGenerativeAI({
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

    if (!AI_CONFIG.supportedFormats.includes(file.type as ImageFormat)) {
      throw new Error(`Unsupported file format: ${file.type}`);
    }
  }

  const provider = createGoogleProvider(apiKey);

  try {
    const images: Array<{ data: Uint8Array; mediaType: string }> = [];

    // Build the proper prompt structure according to AI SDK docs
    // For reference images, we need to construct a messages array with image content
    let promptStructure;
    
    if (referenceImages.length > 0) {
      // When we have reference images, use the message format
      const content: Array<{ type: 'text', text: string } | { type: 'image', image: Uint8Array | Buffer, mediaType?: string }> = [
        {
          type: 'text',
          text: prompt
        }
      ];
      
      // Add reference images to the content
      for (const file of referenceImages) {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        content.push({
          type: 'image',
          image: uint8Array,
          mediaType: file.type
        });
      }
      
      promptStructure = [
        {
          role: 'user' as const,
          content
        }
      ];
    } else {
      // Simple text prompt when no reference images
      promptStructure = prompt;
    }

    // Gemini image outputs are returned via result.files
    // We run count times to request multiple images as needed
    for (let i = 0; i < count; i++) {
      const textResult = await generateText({
        model: provider(AI_CONFIG.model),
        prompt: promptStructure,
      });

      const files = (textResult as any).files as Array<{ mediaType: string; uint8Array?: Uint8Array }> | undefined;
      if (!files || files.length === 0) continue;

      for (const file of files) {
        if (file?.mediaType?.startsWith?.('image/') && file.uint8Array instanceof Uint8Array) {
          images.push({ data: file.uint8Array, mediaType: file.mediaType });
        }
      }
    }

    return { images };
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

