import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { generateAIImages, validateGoogleApiKey, validateImageFile, fileToDataUrl } from '@/lib/ai-utils';
import { putR2BinaryObject } from './r2-functions';
import type {
  AIImageGenerationResponse,
  GeneratedImage,
  StoredImage,
  ServerFunctionResponse,
  ImageUploadResponse,
  ImageFormat
} from '@/types/ai-image';

// R2 Storage prefixes as required by PRD
export const R2_PREFIXES = {
  REFERENCE_IMAGES: 'reference_image',
  GENERATED_IMAGES: 'generations'
} as const;

// Validation schemas
const ImageGenerationSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  prompt: z.string().min(1, 'Prompt is required').max(2000, 'Prompt too long'),
  count: z.number().min(1).max(5),
  referenceImages: z.array(z.any()).max(5).optional().default([])
});

const ImageUploadSchema = z.object({
  fileData: z.string(), // base64 data
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  prefix: z.enum(['reference_image', 'generations'])
});

const BatchImageUploadSchema = z.object({
  images: z.array(z.object({
    fileData: z.string(),
    fileName: z.string(),
    fileType: z.string(),
    fileSize: z.number()
  })).max(5, 'Maximum 5 reference images allowed'),
  prefix: z.enum(['reference_image', 'generations']).default('reference_image')
});

/**
 * Server function to upload reference images to R2 storage
 * Called when user uploads reference images before generation
 * Can be used independently for preview purposes or during generation process
 */
export const uploadReferenceImage = createServerFn({ method: 'POST' })
  .inputValidator((data: { fileData: string; fileName: string; fileType: string; fileSize: number }) =>
    ImageUploadSchema.parse({ ...data, prefix: R2_PREFIXES.REFERENCE_IMAGES })
  )
  .handler(async ({ data }): Promise<ImageUploadResponse> => {
    const startTime = Date.now();

    try {
      // Validate file
      const mockFile = new File([], data.fileName, { type: data.fileType });
      Object.defineProperty(mockFile, 'size', { value: data.fileSize });

      const validation = validateImageFile(mockFile);
      if (!validation.isValid) {
        return {
          success: false,
          imageId: '',
          url: '',
          r2Key: '',
          error: validation.error
        };
      }

      // Generate unique key
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileExtension = data.fileName.split('.').pop() || 'jpg';
      const r2Key = `${data.prefix}/${timestamp}-${randomSuffix}.${fileExtension}`;

      // Convert base64 to buffer for R2 storage
      const base64Data = data.fileData.split(',')[1] || data.fileData;
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      // Upload to R2 using proper API
      const uploadResult = await putR2BinaryObject({
        data: {
          bucket: 'IMAGE_STORAGE',
          key: r2Key,
          data: buffer,
          contentType: data.fileType,
          metadata: {
            originalName: data.fileName,
            uploadType: 'reference',
            uploadedAt: new Date().toISOString(),
            fileSize: String(data.fileSize)
          }
        }
      });

      if (!uploadResult.success) {
        return {
          success: false,
          imageId: '',
          url: '',
          r2Key: '',
          error: `Failed to upload to R2: ${uploadResult.error}`
        };
      }

      // Generate presigned URL for access (Note: R2 doesn't have presigned URLs like S3,
      // so we'll use the R2 public URL if configured, or return the key for internal access)
      const url = `https://image-studio-data.r2.cloudflarestorage.com/${r2Key}`;

      const duration = Date.now() - startTime;
      console.log(`Reference image uploaded: ${r2Key} (${duration}ms)`);

      return {
        success: true,
        imageId: `${timestamp}-${randomSuffix}`,
        url,
        r2Key,
      };

    } catch (error) {
      console.error(`Failed to upload reference image after ${Date.now() - startTime}ms:`, error);

      return {
        success: false,
        imageId: '',
        url: '',
        r2Key: '',
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  });

/**
 * Server function to batch upload multiple reference images to R2 storage
 * More efficient than individual uploads when handling multiple files
 */
export const batchUploadReferenceImages = createServerFn({ method: 'POST' })
  .inputValidator((data: { images: Array<{ fileData: string; fileName: string; fileType: string; fileSize: number }> }) =>
    BatchImageUploadSchema.parse({ ...data, prefix: R2_PREFIXES.REFERENCE_IMAGES })
  )
  .handler(async ({ data }): Promise<ServerFunctionResponse<{ uploadedImages: StoredImage[]; failedUploads: Array<{ fileName: string; error: string }> }>> => {
    const startTime = Date.now();

    try {
      const uploadedImages: StoredImage[] = [];
      const failedUploads: Array<{ fileName: string; error: string }> = [];

      // Process each image in parallel for better performance
      const uploadPromises = data.images.map(async (imageData, index) => {
        try {
          // Validate file
          const mockFile = new File([], imageData.fileName, { type: imageData.fileType });
          Object.defineProperty(mockFile, 'size', { value: imageData.fileSize });

          const validation = validateImageFile(mockFile);
          if (!validation.isValid) {
            failedUploads.push({
              fileName: imageData.fileName,
              error: validation.error || 'Validation failed'
            });
            return;
          }

          // Generate unique key with batch prefix
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          const fileExtension = imageData.fileName.split('.').pop() || 'jpg';
          const r2Key = `${data.prefix}/${timestamp}-batch-${index}-${randomSuffix}.${fileExtension}`;

          // Convert base64 to buffer for R2 storage
          const base64Data = imageData.fileData.split(',')[1] || imageData.fileData;
          const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

          // Upload to R2 using proper API
          const uploadResult = await putR2BinaryObject({
            data: {
              bucket: 'IMAGE_STORAGE',
              key: r2Key,
              data: buffer,
              contentType: imageData.fileType,
              metadata: {
                originalName: imageData.fileName,
                uploadType: 'reference_batch',
                uploadedAt: new Date().toISOString(),
                fileSize: String(imageData.fileSize),
                batchIndex: String(index),
                batchTimestamp: String(timestamp)
              }
            }
          });

          if (!uploadResult.success) {
            failedUploads.push({
              fileName: imageData.fileName,
              error: `Failed to upload to R2: ${uploadResult.error}`
            });
            return;
          }

          // Generate public URL
          const url = `https://image-studio-data.r2.cloudflarestorage.com/${r2Key}`;

          uploadedImages.push({
            id: `${timestamp}-batch-${index}-${randomSuffix}`,
            url,
            filename: imageData.fileName,
            originalName: imageData.fileName,
            format: imageData.fileType as ImageFormat,
            size: imageData.fileSize,
            r2Key,
            type: 'reference'
          });

        } catch (error) {
          failedUploads.push({
            fileName: imageData.fileName,
            error: error instanceof Error ? error.message : 'Upload failed'
          });
        }
      });

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);

      const duration = Date.now() - startTime;
      console.log(`Batch uploaded ${uploadedImages.length} reference images (${failedUploads.length} failed) in ${duration}ms`);

      return {
        success: true,
        data: {
          uploadedImages,
          failedUploads
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Batch reference image upload failed after ${Date.now() - startTime}ms:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Batch upload failed',
        timestamp: new Date().toISOString()
      };
    }
  });

/**
 * Server function to generate AI images using Google Gemini
 * Main function for the AI Image Studio functionality
 */
export const generateImages = createServerFn({ method: 'POST' })
  .inputValidator((data) => ImageGenerationSchema.parse(data))
  .handler(async ({ data }): Promise<AIImageGenerationResponse> => {
    const startTime = Date.now();

    try {
      // Validate API key
      const keyValidation = validateGoogleApiKey(data.apiKey);
      if (!keyValidation.isValid) {
        return {
          success: false,
          error: keyValidation.error || 'Invalid API key'
        };
      }

      // Process reference images if provided
      const processedReferenceImages: StoredImage[] = [];
      if (data.referenceImages && data.referenceImages.length > 0) {
        for (let i = 0; i < data.referenceImages.length; i++) {
          const file = data.referenceImages[i];

          // Validate each reference image
          const validation = validateImageFile(file);
          if (!validation.isValid) {
            return {
              success: false,
              error: `Reference image ${i + 1}: ${validation.error}`
            };
          }

          // Upload reference image to R2
          const fileData = await fileToDataUrl(file);
          const uploadResponse = await uploadReferenceImage({
            data: {
              fileData,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size
            }
          });

          if (!uploadResponse.success) {
            return {
              success: false,
              error: `Failed to upload reference image ${i + 1}: ${uploadResponse.error}`
            };
          }

          processedReferenceImages.push({
            id: uploadResponse.imageId,
            url: uploadResponse.url,
            filename: file.name,
            originalName: file.name,
            format: file.type as ImageFormat,
            size: file.size,
            r2Key: uploadResponse.r2Key,
            type: 'reference'
          });
        }
      }

      // Generate images using AI SDK
      console.log(`Generating ${data.count} images with prompt: "${data.prompt.substring(0, 100)}..."`);

      const aiResult = await generateAIImages({
        apiKey: data.apiKey,
        prompt: data.prompt,
        referenceImages: data.referenceImages,
        count: data.count
      });

      // Process generated images and upload to R2
      const generatedImages: GeneratedImage[] = [];

      console.log(`AI generation result: ${aiResult.images?.length || 0} images returned`);

      if (aiResult.images && aiResult.images.length > 0) {
        for (let i = 0; i < aiResult.images.length; i++) {
          const image = aiResult.images[i] as { data?: Uint8Array; mediaType?: string };

          try {
            const contentType = image.mediaType || 'image/png';
            const imageBytes = image.data;
            
            console.log(`Processing generated image ${i + 1}: contentType=${contentType}, dataType=${typeof imageBytes}, isUint8Array=${imageBytes instanceof Uint8Array}, size=${imageBytes?.byteLength || 'unknown'}`);
            
            if (!(imageBytes instanceof Uint8Array)) {
              throw new Error(`Invalid image data for generated image ${i + 1}: expected Uint8Array, got ${typeof imageBytes}`);
            }

            // Generate R2 key for generated image
            const timestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            const fileExtension = contentType.includes('png') ? 'png' : 'jpg';
            const r2Key = `${R2_PREFIXES.GENERATED_IMAGES}/${timestamp}-${i}-${randomSuffix}.${fileExtension}`;

            console.log(`Uploading generated image to R2: ${r2Key}, size: ${imageBytes.byteLength} bytes`);

            // Upload to R2 using proper API
            const uploadResult = await putR2BinaryObject({
              data: {
                bucket: 'IMAGE_STORAGE',
                key: r2Key,
                data: imageBytes,
                contentType,
                metadata: {
                  generatedAt: new Date().toISOString(),
                  prompt: data.prompt.substring(0, 500), // Limit prompt length in metadata
                  imageIndex: String(i),
                  generationBatch: String(timestamp),
                  model: 'gemini-2.5-flash-image-preview'
                }
              }
            });

            if (!uploadResult.success) {
              throw new Error(`Failed to upload to R2: ${uploadResult.error}`);
            }

            console.log(`Successfully uploaded generated image to R2: ${r2Key}`);

            const publicUrl = `https://image-studio-data.r2.cloudflarestorage.com/${r2Key}`;

            generatedImages.push({
              id: `${timestamp}-${i}-${randomSuffix}`,
              url: publicUrl,
              filename: `generated-${timestamp}-${i}.${fileExtension}`,
              format: contentType as ImageFormat,
              size: imageBytes.byteLength,
              createdAt: new Date().toISOString(),
              r2Key
            });

            console.log(`Generated image ${i + 1} processed successfully: ${r2Key}`);

          } catch (error) {
            console.error(`Failed to process generated image ${i + 1}:`, error);
            // Continue with other images even if one fails
          }
        }
      }

      if (generatedImages.length === 0) {
        return {
          success: false,
          error: 'No images were successfully generated and stored'
        };
      }

      const generationTime = Date.now() - startTime;
      console.log(`Generated ${generatedImages.length} images in ${generationTime}ms`);

      return {
        success: true,
        images: generatedImages,
        referenceImages: processedReferenceImages,
        generationTime
      };

    } catch (error) {
      const generationTime = Date.now() - startTime;
      console.error('Image generation failed:', error);

      let errorMessage = 'Image generation failed';

      if (error instanceof Error) {
        if (error.message.includes('quota')) {
          errorMessage = 'API quota exceeded. Please check your Google API usage limits.';
        } else if (error.message.includes('authentication') || error.message.includes('API key')) {
          errorMessage = 'Invalid API key. Please check your Google API key.';
        } else if (error.message.includes('rate limit')) {
          errorMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
        generationTime
      };
    }
  });

/**
 * Server function to get a presigned URL for downloading images
 * Used for the download functionality in the UI
 */
export const getImageDownloadUrl = createServerFn({ method: 'POST' })
  .inputValidator((data: { r2Key: string }) => z.object({ r2Key: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<ServerFunctionResponse<{ downloadUrl: string; filename: string }>> => {
    const { env } = await import('cloudflare:workers');

    try {
      const object = await env.IMAGE_STORAGE.get(data.r2Key);

      if (!object) {
        return {
          success: false,
          error: 'Image not found',
          timestamp: new Date().toISOString()
        };
      }

      // For R2, we'll return the content as base64 for client-side download
      const imageBuffer = await object.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
      const contentType = object.httpMetadata?.contentType || 'image/jpeg';
      const dataUrl = `data:${contentType};base64,${base64}`;

      // Extract filename from metadata or generate one
      const originalName = object.customMetadata?.originalName;
      const filename = originalName || data.r2Key.split('/').pop() || 'image.jpg';

      return {
        success: true,
        data: {
          downloadUrl: dataUrl,
          filename
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to get image download URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get download URL',
        timestamp: new Date().toISOString()
      };
    }
  });

/**
 * Server function to list images in R2 storage
 * Useful for debugging and administration
 */
export const listStoredImages = createServerFn()
  .handler(async (): Promise<ServerFunctionResponse<{ images: Array<{ key: string; size: number; uploaded: string; metadata: any }> }>> => {
    const { env } = await import('cloudflare:workers');

    try {
      const list = await env.IMAGE_STORAGE.list();

      const images = list.objects?.map((obj: any) => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded,
        metadata: obj.customMetadata || {}
      })) || [];

      return {
        success: true,
        data: { images },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to list stored images:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list images',
        timestamp: new Date().toISOString()
      };
    }
  });

/**
 * Debug function to list only generated images from R2 storage
 */
export const listGeneratedImages = createServerFn()
  .handler(async (): Promise<ServerFunctionResponse<{ generatedImages: Array<{ key: string; size: number; uploaded: string; metadata: any }> }>> => {
    const { env } = await import('cloudflare:workers');

    try {
      // List only images with the 'generations' prefix
      const list = await env.IMAGE_STORAGE.list({ prefix: R2_PREFIXES.GENERATED_IMAGES });

      const generatedImages = list.objects?.map((obj: any) => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded,
        metadata: obj.customMetadata || {}
      })) || [];

      console.log(`Found ${generatedImages.length} generated images in R2`);
      generatedImages.forEach((img, index) => {
        console.log(`Generated image ${index + 1}: ${img.key}, size: ${img.size}, metadata:`, img.metadata);
      });

      return {
        success: true,
        data: { generatedImages },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to list generated images:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list generated images',
        timestamp: new Date().toISOString()
      };
    }
  });