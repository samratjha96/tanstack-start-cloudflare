import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { generateSingleImage } from '@/core/functions/ai-image-functions';
import { fileToDataUrl } from '@/lib/ai-utils';
import type { GeneratedImage } from '@/types/ai-image';

interface GenerationRequest {
  apiKey: string;
  prompt: string;
  imageIndex: number;
  batchId: string;
  referenceImages: File[];
  referenceImageKeys?: string[];
}

export interface ImageSlot {
  id: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  prompt: string;
  imageIndex: number;
  batchId: string;
  startTime?: number;
  image?: GeneratedImage;
  error?: string;
}

/**
 * Simplified image generation hook
 * Creates image slots upfront and fills them as they complete
 */
export function useImageGeneration() {
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>([]);

  const generateMutation = useMutation({
    mutationFn: async (data: GenerationRequest & { slotId: string }) => {
      const serializedReferenceImages = await Promise.all(
        data.referenceImages.map(async (file) => ({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileData: await fileToDataUrl(file)
        }))
      );
      
      return {
        slotId: data.slotId,
        result: await generateSingleImage({ 
          data: { 
            apiKey: data.apiKey, 
            prompt: data.prompt, 
            imageIndex: data.imageIndex,
            batchId: data.batchId,
            referenceImages: serializedReferenceImages 
          } 
        })
      };
    },
    onSuccess: ({ slotId, result }) => {
      setImageSlots(prev => 
        prev.map(slot => {
          if (slot.id !== slotId) return slot;
          
          if (result.success && result.images?.[0]) {
            return {
              ...slot,
              status: 'completed' as const,
              image: result.images[0]
            };
          } else {
            return {
              ...slot,
              status: 'error' as const,
              error: result.error || 'Generation failed'
            };
          }
        })
      );
    },
    onError: (error, { slotId }) => {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      setImageSlots(prev => 
        prev.map(slot => 
          slot.id === slotId 
            ? { ...slot, status: 'error' as const, error: errorMessage }
            : slot
        )
      );
    }
  });

  const startBatchGeneration = useCallback((request: Omit<GenerationRequest, 'imageIndex' | 'batchId'> & { imageCount: number }) => {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create all slots upfront
    const newSlots: ImageSlot[] = Array.from({ length: request.imageCount }, (_, index) => ({
      id: `slot_${batchId}_${index}`,
      status: 'pending',
      prompt: request.prompt,
      imageIndex: index,
      batchId,
    }));

    setImageSlots(prev => [...prev, ...newSlots]);

    // Start all generations
    newSlots.forEach(slot => {
      // Update slot to generating status
      setImageSlots(prev => 
        prev.map(s => 
          s.id === slot.id 
            ? { ...s, status: 'generating' as const, startTime: Date.now() }
            : s
        )
      );

      // Start the mutation
      generateMutation.mutate({
        ...request,
        imageIndex: slot.imageIndex,
        batchId: slot.batchId,
        slotId: slot.id
      });
    });

    return batchId;
  }, [generateMutation]);

  const cancelGeneration = useCallback((slotId: string) => {
    setImageSlots(prev => 
      prev.map(slot => 
        slot.id === slotId && slot.status === 'generating'
          ? { ...slot, status: 'error' as const, error: 'Cancelled by user' }
          : slot
      )
    );
  }, []);

  const clearCompleted = useCallback(() => {
    setImageSlots(prev => prev.filter(slot => slot.status === 'generating' || slot.status === 'pending'));
  }, []);

  const clearAll = useCallback(() => {
    setImageSlots([]);
  }, []);

  const hasActiveGenerations = imageSlots.some(slot => slot.status === 'generating' || slot.status === 'pending');
  const completedImages = imageSlots.filter(slot => slot.status === 'completed' && slot.image).map(slot => slot.image!);

  return {
    imageSlots,
    completedImages,
    hasActiveGenerations,
    startBatchGeneration,
    cancelGeneration,
    clearCompleted,
    clearAll,
    isGenerating: generateMutation.isPending
  };
}
