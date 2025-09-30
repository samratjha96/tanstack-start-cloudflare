import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getObjectUrl } from '@/core/functions/explorer-functions';
import type { GeneratedImage, StoredImage } from '@/types/ai-image';

type ImageWithUrl<T> = T & { url: string; isLoading?: boolean; hasError?: boolean };

/**
 * Hook to load R2 images and convert them to data URLs for display
 */
export function useR2Images<T extends GeneratedImage | StoredImage>(images: T[] | undefined) {
  // Handle undefined or null images array and memoize to prevent unnecessary re-renders
  const safeImages = useMemo(() => images || [], [images]);
  
  // Use useQueries instead of mapping over useQuery to avoid hook order violations
  const results = useQueries({
    queries: safeImages.map((image) => ({
      queryKey: ['r2-image', image.r2Key],
      queryFn: () => getObjectUrl({ data: { key: image.r2Key, expiresIn: 3600 } }),
      enabled: !!image.r2Key,
      staleTime: 30 * 60 * 1000, // 30 minutes
      retry: 2,
    }))
  });

  // Transform images with loaded URLs
  const imagesWithUrls: ImageWithUrl<T>[] = safeImages.map((image, index) => {
    const queryResult = results[index];
    
    if (queryResult.isLoading) {
      return { ...image, url: '', isLoading: true };
    }
    
    if (queryResult.error || !queryResult.data?.success || !queryResult.data.url?.startsWith('data:image')) {
      return { ...image, url: '', hasError: true };
    }
    
    return { ...image, url: queryResult.data.url, isLoading: false };
  });

  const isLoading = results.some(result => result.isLoading);
  const hasError = results.some(result => result.error);

  return {
    images: imagesWithUrls,
    isLoading,
    hasError
  };
}
