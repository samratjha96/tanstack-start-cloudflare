/**
 * Type definitions for AI Image Generation functionality
 */

// Core AI image generation types
export interface AIImageGenerationRequest {
  apiKey: string;
  prompt: string;
  referenceImages?: File[];
  count: number; // 1-5 images
}

export interface AIImageGenerationResponse {
  success: boolean;
  images?: GeneratedImage[];
  referenceImages?: StoredImage[];
  error?: string;
  generationTime?: number; // in milliseconds
}

export interface GeneratedImage {
  id: string;
  url: string;
  filename: string;
  format: ImageFormat;
  size: number; // file size in bytes
  dimensions?: ImageDimensions;
  createdAt: string; // ISO timestamp
  r2Key: string; // R2 storage key
}

export interface StoredImage {
  id: string;
  url: string;
  filename: string;
  originalName: string;
  format: ImageFormat;
  size: number;
  dimensions?: ImageDimensions;
  r2Key: string;
  type: 'reference' | 'generated';
}

export interface ImageDimensions {
  width: number;
  height: number;
}

// Supported image formats
export type ImageFormat =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/gif';

// AI model configuration
export interface AIModelConfig {
  model: string;
  maxImages: number;
  maxFileSize: number;
  supportedFormats: readonly ImageFormat[];
}

// Generation status tracking
export interface GenerationStatus {
  status: 'idle' | 'validating' | 'uploading' | 'generating' | 'storing' | 'completed' | 'error';
  progress: number; // 0-100
  message?: string;
  startTime?: number;
  elapsedTime?: number;
}

// API key validation
export interface APIKeyValidation {
  isValid: boolean;
  error?: string;
}

// File upload types
export interface FileUploadValidation {
  isValid: boolean;
  file?: File;
  error?: string;
}

export interface UploadedFile {
  file: File;
  preview: string; // data URL for preview
  id: string;
  isValid: boolean;
  validationError?: string;
}

// Server function response types
export interface ServerFunctionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface ImageUploadResponse {
  success: boolean;
  imageId: string;
  url: string;
  r2Key: string;
  error?: string;
}

// UI Component prop types
export interface ImagePreviewProps {
  image: StoredImage | GeneratedImage;
  onDownload: (image: StoredImage | GeneratedImage) => void;
  onPreview?: (image: StoredImage | GeneratedImage) => void;
  showMetadata?: boolean;
}

export interface ImageGeneration {
  id: string;
  prompt: string;
  imageCount: number;
  startTime: number;
  status: 'pending' | 'generating' | 'completed' | 'error';
  images?: GeneratedImage[];
  error?: string;
  referenceImages?: StoredImage[];
}

export interface ImageGenerationProps {
  generation: ImageGeneration;
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
  onImagePreview?: (image: StoredImage | GeneratedImage) => void;
  onImageDownload?: (image: StoredImage | GeneratedImage) => void;
}

export interface ImageGalleryProps {
  referenceImages: StoredImage[];
  generatedImages: GeneratedImage[];
  onDownload?: (image: StoredImage | GeneratedImage) => void;
  onPreview?: (image: StoredImage | GeneratedImage) => void;
  loading?: boolean;
  isGenerating?: boolean;
  elapsedTime?: number;
  generationError?: string;
}

export interface ImageUploadProps {
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles: number;
  maxFileSize: number;
  acceptedFormats: readonly ImageFormat[];
  disabled?: boolean;
}

export interface GenerationProgressProps {
  status: GenerationStatus;
  onCancel?: () => void;
}

// Form types
export interface ImageGenerationForm {
  apiKey: string;
  prompt: string;
  imageCount: number;
  referenceImages: UploadedFile[];
}

// Error types
export interface AIImageError {
  type: 'validation' | 'api' | 'upload' | 'storage' | 'network' | 'unknown';
  message: string;
  details?: any;
  timestamp: string;
}

// Constants type
export interface AIImageConstants {
  MAX_IMAGES: number;
  MAX_FILE_SIZE: number;
  SUPPORTED_FORMATS: readonly ImageFormat[];
  API_KEY_LENGTH: number;
  R2_PREFIXES: {
    REFERENCE: string;
    GENERATED: string;
  };
}

// Utility function types
export type FileValidator = (file: File) => FileUploadValidation;
export type APIKeyValidator = (apiKey: string) => APIKeyValidation;
export type ImageProcessor = (file: File) => Promise<string>; // Returns data URL
export type ImageDownloader = (url: string, filename: string) => void;

// Server function types (for TanStack Start)
export type GenerateImagesServerFn = (request: AIImageGenerationRequest) => Promise<AIImageGenerationResponse>;
export type UploadImageServerFn = (file: File, prefix: string) => Promise<ImageUploadResponse>;

// React component state types
export interface StudioPageState {
  form: ImageGenerationForm;
  generationStatus: GenerationStatus;
  referenceImages: StoredImage[];
  generatedImages: GeneratedImage[];
  errors: AIImageError[];
}