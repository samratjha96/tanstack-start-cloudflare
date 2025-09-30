import { useState, useEffect } from 'react';
import {
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useImageDownload } from '@/hooks/use-image-download';
import type { StoredImage, GeneratedImage } from '@/types/ai-image';

interface ImageLightboxProps {
  images: (StoredImage | GeneratedImage)[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
}

export function ImageLightbox({
  images,
  currentIndex,
  isOpen,
  onClose,
  onIndexChange
}: ImageLightboxProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const { downloadImage, isImageDownloading } = useImageDownload();

  const currentImage = images[currentIndex];

  // Reset loading state when image changes
  useEffect(() => {
    setImageLoading(true);
  }, [currentIndex]);


  const handlePrevious = () => {
    if (currentIndex > 0) {
      onIndexChange?.(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      onIndexChange?.(currentIndex + 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        handlePrevious();
        break;
      case 'ArrowRight':
        handleNext();
        break;
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, currentIndex, images.length]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  if (!currentImage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="!max-w-none !max-h-none !w-screen !h-screen !p-0 !gap-0 !border-0 !rounded-none !bg-transparent !top-0 !left-0 !transform-none !translate-x-0 !translate-y-0 overflow-hidden fixed inset-0 !z-[100]"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          Image Lightbox - {currentImage.filename}
        </DialogTitle>
        <div className="relative w-full h-full bg-black/95 flex flex-col">
          {/* Header with controls */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  'createdAt' in currentImage
                    ? "bg-primary/90 text-primary-foreground"
                    : "bg-secondary/90 text-secondary-foreground"
                )}>
                  {'createdAt' in currentImage ? 'Generated' : 'Reference'}
                </div>
                {images.length > 1 && (
                  <span className="text-white/70 text-sm">
                    {currentIndex + 1} of {images.length}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => downloadImage(currentImage)}
                  disabled={isImageDownloading(currentImage.id)}
                  className="text-white hover:bg-white/20"
                >
                  {isImageDownloading(currentImage.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Main image container */}
          <div className="flex-1 flex items-center justify-center p-4 pt-16 pb-20">
            <div className="relative max-w-full max-h-full">
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
              {currentImage.url ? (
                <img
                  src={currentImage.url}
                  alt={currentImage.filename}
                  className={cn(
                    "max-w-full max-h-full object-contain transition-opacity duration-200",
                    imageLoading && "opacity-0"
                  )}
                  onLoad={() => setImageLoading(false)}
                  onError={() => setImageLoading(false)}
                />
              ) : (
                <div className="flex items-center justify-center text-white">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="text-sm">Loading image...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <Button
                size="lg"
                variant="ghost"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 disabled:opacity-30"
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={handleNext}
                disabled={currentIndex === images.length - 1}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 disabled:opacity-30"
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}

          {/* Footer with image info */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
            <div className="text-white space-y-1">
              <p className="font-medium truncate" title={currentImage.filename}>
                {currentImage.filename}
              </p>
              <div className="flex items-center justify-between text-sm text-white/70">
                <div className="flex items-center space-x-4">
                  <span>{formatFileSize(currentImage.size)}</span>
                  {currentImage.dimensions && (
                    <span>{currentImage.dimensions.width} × {currentImage.dimensions.height}</span>
                  )}
                </div>
                {'createdAt' in currentImage && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(currentImage.createdAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="absolute bottom-4 right-4 text-xs text-white/50">
            <div>Use arrow keys to navigate • ESC to close</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}