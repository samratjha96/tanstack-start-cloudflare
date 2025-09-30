import { useState, useCallback } from 'react';
import { downloadImageAsBlob, sanitizeFilename, getFileExtensionFromUrl } from '@/lib/file-utils';
import type { StoredImage, GeneratedImage } from '@/types/ai-image';

interface DownloadState {
  isDownloading: boolean;
  downloadingId: string | null;
  error: string | null;
}

export function useImageDownload() {
  const [downloadState, setDownloadState] = useState<DownloadState>({
    isDownloading: false,
    downloadingId: null,
    error: null
  });

  const downloadImage = useCallback(async (image: StoredImage | GeneratedImage) => {
    setDownloadState({
      isDownloading: true,
      downloadingId: image.id,
      error: null
    });

    try {
      // Generate filename
      let filename: string;

      if ('originalName' in image && image.originalName) {
        // For StoredImage with original name
        filename = sanitizeFilename(image.originalName);
      } else {
        // For GeneratedImage or StoredImage without originalName
        const extension = getFileExtensionFromUrl(image.url);
        const timestamp = 'createdAt' in image
          ? new Date(image.createdAt).toISOString().slice(0, 16).replace(/[:-]/g, '')
          : Date.now().toString();

        let baseFilename = image.filename || `image_${timestamp}`;

        // Check if filename already has an extension
        if (baseFilename.includes('.')) {
          filename = sanitizeFilename(baseFilename);
        } else {
          filename = sanitizeFilename(`${baseFilename}.${extension}`);
        }
      }

      // Download the image
      await downloadImageAsBlob(image.url, filename);

      setDownloadState({
        isDownloading: false,
        downloadingId: null,
        error: null
      });
    } catch (error) {
      console.error('Image download failed:', error);
      setDownloadState({
        isDownloading: false,
        downloadingId: null,
        error: error instanceof Error ? error.message : 'Download failed'
      });
    }
  }, []);

  const downloadMultipleImages = useCallback(async (images: (StoredImage | GeneratedImage)[]) => {
    setDownloadState({
      isDownloading: true,
      downloadingId: 'bulk',
      error: null
    });

    const errors: string[] = [];

    for (const image of images) {
      try {
        await downloadImage(image);
        // Small delay between downloads to prevent overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        errors.push(`Failed to download ${image.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    setDownloadState({
      isDownloading: false,
      downloadingId: null,
      error: errors.length > 0 ? errors.join('; ') : null
    });
  }, [downloadImage]);

  const clearError = useCallback(() => {
    setDownloadState(prev => ({ ...prev, error: null }));
  }, []);

  const isImageDownloading = useCallback((imageId: string) => {
    return downloadState.downloadingId === imageId;
  }, [downloadState.downloadingId]);

  return {
    downloadImage,
    downloadMultipleImages,
    clearError,
    isImageDownloading,
    isDownloading: downloadState.isDownloading,
    error: downloadState.error
  };
}