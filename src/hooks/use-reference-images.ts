import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { batchUploadReferenceImages } from '@/core/functions/ai-image-functions';
import { fileToDataUrl } from '@/lib/ai-utils';
import type { StoredImage, UploadedFile } from '@/types/ai-image';

interface UseReferenceImagesOptions {
  onUploadComplete?: (images: StoredImage[]) => void;
  onUploadError?: (error: string) => void;
}

export function useReferenceImages(options: UseReferenceImagesOptions = {}) {
  const [uploadedReferenceImages, setUploadedReferenceImages] = useState<StoredImage[]>([]);
  const [referenceImageKeys, setReferenceImageKeys] = useState<string[]>([]);

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const imageData = await Promise.all(
        files.map(async (file) => ({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileData: await fileToDataUrl(file)
        }))
      );

      return await batchUploadReferenceImages({
        data: { images: imageData }
      });
    },
    onSuccess: (response) => {
      if (response.success && response.data?.uploadedImages) {
        setUploadedReferenceImages(response.data.uploadedImages);
        setReferenceImageKeys(response.data.uploadedImages.map(img => img.r2Key));
        options.onUploadComplete?.(response.data.uploadedImages);
      } else {
        const error = response.error || 'Upload failed';
        options.onUploadError?.(error);
      }
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      options.onUploadError?.(errorMessage);
    }
  });

  const uploadReferenceImages = useCallback(async (uploadedFiles: UploadedFile[]) => {
    const validFiles = uploadedFiles
      .filter(f => f.isValid)
      .map(f => f.file);

    if (validFiles.length === 0) {
      setUploadedReferenceImages([]);
      setReferenceImageKeys([]);
      return;
    }

    uploadMutation.mutate(validFiles);
  }, [uploadMutation]);

  const clearReferenceImages = useCallback(() => {
    setUploadedReferenceImages([]);
    setReferenceImageKeys([]);
  }, []);

  return {
    uploadedReferenceImages,
    referenceImageKeys,
    uploadReferenceImages,
    clearReferenceImages,
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error
  };
}
