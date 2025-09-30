import { useState, useEffect } from 'react';
import { Loader2, X, RotateCcw, Clock, Image, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useImageDownload } from '@/hooks/use-image-download';
import { useR2Images } from '@/hooks/use-r2-images';
import { ImageLightbox } from './image-lightbox';
import type { ImageGenerationProps, StoredImage, GeneratedImage } from '@/types/ai-image';

export function ImageGeneration({
  generation,
  onCancel,
  onRetry,
  onImagePreview,
  onImageDownload
}: ImageGenerationProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const { downloadImage, isImageDownloading } = useImageDownload();

  // Load R2 images with proper URLs for display
  const { images: imagesWithUrls } = useR2Images(generation.images);

  // Track elapsed time for active generations
  useEffect(() => {
    let timer: number | undefined;
    
    if (generation.status === 'generating') {
      const updateElapsed = () => {
        setElapsedTime(Date.now() - generation.startTime);
      };
      
      updateElapsed(); // Initial update
      timer = window.setInterval(updateElapsed, 100);
    }

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [generation.status, generation.startTime]);

  const handleImageDownload = (image: StoredImage | GeneratedImage) => {
    downloadImage(image);
    onImageDownload?.(image);
  };

  const handleImagePreview = (image: StoredImage | GeneratedImage) => {
    if (imagesWithUrls) {
      const index = imagesWithUrls.findIndex(img => img.id === image.id);
      if (index !== -1) {
        setLightboxIndex(index);
        setLightboxOpen(true);
      }
    }
    onImagePreview?.(image);
  };

  const formatTime = (ms: number): string => {
    return (ms / 1000).toFixed(1);
  };

  const truncatePrompt = (prompt: string, maxLength: number = 100): string => {
    return prompt.length > maxLength ? `${prompt.slice(0, maxLength)}...` : prompt;
  };

  const ImageSkeleton = () => (
    <div className="w-full h-32 bg-muted rounded-lg animate-pulse flex items-center justify-center">
      <div className="text-center space-y-2">
        <Image className="h-6 w-6 mx-auto text-muted-foreground/50" />
        <div className="w-16 h-2 bg-muted-foreground/20 rounded mx-auto"></div>
      </div>
    </div>
  );

  const ImageCard = ({ image }: { image: StoredImage | GeneratedImage }) => (
    <div className="relative group">
      <div className="relative rounded-lg border overflow-hidden bg-muted">
        {image.url ? (
          <img
            src={image.url}
            alt={image.filename}
            className="w-full h-32 object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <ImageSkeleton />
        )}

        {/* Overlay with actions */}
        {image.url && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center">
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleImagePreview(image);
                }}
                className="backdrop-blur-sm"
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageDownload(image);
                }}
                disabled={isImageDownloading(image.id)}
                className="backdrop-blur-sm"
              >
                {isImageDownloading(image.id) ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Card className={cn(
      "transition-all duration-200",
      generation.status === 'generating' && "border-primary/50 shadow-sm",
      generation.status === 'error' && "border-destructive/50",
      generation.status === 'completed' && "border-green-500/50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base leading-tight">
                Generation #{generation.id.slice(-4)}
              </CardTitle>
              <div className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                generation.status === 'pending' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                generation.status === 'generating' && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                generation.status === 'completed' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                generation.status === 'error' && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              )}>
                {generation.status === 'generating' && <Loader2 className="h-3 w-3 animate-spin inline mr-1" />}
                {generation.status === 'pending' && <Clock className="h-3 w-3 inline mr-1" />}
                <span className="capitalize">{generation.status}</span>
              </div>
            </div>
            <CardDescription className="text-sm pr-2">
              {truncatePrompt(generation.prompt)}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-1 ml-2">
            {generation.status === 'generating' && onCancel && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onCancel(generation.id)}
                className="h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            {generation.status === 'error' && onRetry && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRetry(generation.id)}
                className="h-7 w-7 p-0"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Status details */}
        {generation.status === 'generating' && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>Elapsed: {formatTime(elapsedTime)}s</span>
            <span>•</span>
            <span>{generation.imageCount} image{generation.imageCount !== 1 ? 's' : ''} requested</span>
          </div>
        )}

        {generation.status === 'error' && generation.error && (
          <div className="text-xs text-destructive">
            {generation.error}
          </div>
        )}

        {generation.status === 'completed' && imagesWithUrls && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{imagesWithUrls.length} image{imagesWithUrls.length !== 1 ? 's' : ''} generated</span>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Image Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {generation.status === 'generating' || generation.status === 'pending' ? (
            // Show skeletons for pending/generating
            Array.from({ length: generation.imageCount }).map((_, index) => (
              <ImageSkeleton key={index} />
            ))
          ) : generation.status === 'completed' && imagesWithUrls ? (
            // Show generated images
            imagesWithUrls.map((image) => (
              <ImageCard key={image.id} image={image} />
            ))
          ) : generation.status === 'error' ? (
            // Show error state
            <div className="col-span-full flex items-center justify-center py-8 text-center">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                  <X className="h-6 w-6 text-destructive" />
                </div>
                <p className="text-sm text-muted-foreground">Generation failed</p>
                {onRetry && (
                  <Button size="sm" variant="outline" onClick={() => onRetry(generation.id)}>
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>

      {/* Image Lightbox */}
      {imagesWithUrls && imagesWithUrls.length > 0 && (
        <ImageLightbox
          images={imagesWithUrls}
          currentIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </Card>
  );
}
