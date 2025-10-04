import { useState, useEffect } from 'react';
import { Download, Eye, Calendar, FileImage, Loader2, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useImageDownload } from '@/hooks/use-image-download';
import { ImageLightbox } from './image-lightbox';
import type { ImageGalleryProps, StoredImage, GeneratedImage } from '@/types/ai-image';
import type { ImageSlot } from '@/hooks/use-image-generation';

export function ImageGallery({
  generatedImages,
  onDownload,
  onPreview,
  loading = false,
  isGenerating = false,
  elapsedTime = 0,
  generationError,
  imageSlots = [],
  onCancelGeneration,
}: Omit<ImageGalleryProps, 'referenceImages'> & {
  imageSlots?: ImageSlot[];
  onCancelGeneration?: (id: string) => void;
}) {
  const { downloadImage, isImageDownloading } = useImageDownload();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [generationTimers, setGenerationTimers] = useState<Record<string, number>>({});

  // Get completed images with proper URLs for lightbox navigation
  const allImages = imageSlots
    .filter(slot => slot.status === 'completed' && slot.image)
    .map(slot => {
      // Find the corresponding image with URL from generatedImages
      const imageWithUrl = generatedImages.find(img => img.id === slot.image!.id);
      return imageWithUrl || slot.image!;
    })
    .filter(img => img.url); // Only include images that have URLs loaded

  // Update timers for active image slots (reduced frequency to prevent spazzing)
  useEffect(() => {
    const activeSlots = imageSlots.filter(slot => slot.status === 'generating');

    if (activeSlots.length === 0) {
      // Clear timers for completed/failed generations
      setGenerationTimers(prev => {
        const updated = { ...prev };
        imageSlots.forEach(slot => {
          if (slot.status !== 'generating') {
            delete updated[slot.id];
          }
        });
        return updated;
      });
      return;
    }

    const timer = setInterval(() => {
      setGenerationTimers(prev => {
        const updated = { ...prev };
        activeSlots.forEach(slot => {
          if (slot.startTime) {
            const newTime = Date.now() - slot.startTime;
            // Only update if change is significant (reduce unnecessary re-renders)
            if (!updated[slot.id] || Math.abs(updated[slot.id] - newTime) > 50) {
              updated[slot.id] = newTime;
            }
          }
        });
        return updated;
      });
    }, 500); // Reduced from 100ms to 500ms to prevent excessive updates

    return () => clearInterval(timer);
  }, [imageSlots]);
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

  const openLightbox = (image: StoredImage | GeneratedImage) => {
    const index = allImages.findIndex(img => img.id === image.id);
    if (index !== -1) {
      setLightboxIndex(index);
      setLightboxOpen(true);
    }
  };

  const formatTime = (ms: number): string => {
    return (ms / 1000).toFixed(1);
  };

  const ImageSlotCard = ({ slot }: { slot: ImageSlot }) => {
    const elapsedTime = generationTimers[slot.id] || 0;
    const isError = slot.status === 'error';
    const isCompleted = slot.status === 'completed';
    const isGenerating = slot.status === 'generating';

    // Memoize the formatted time to prevent unnecessary re-renders
    const formattedTime = formatTime(elapsedTime);

    // If completed and has image, find the corresponding image with URL from generatedImages
    if (isCompleted && slot.image) {
      // Find the image with proper URL loading from the generatedImages prop
      const imageWithUrl = generatedImages.find(img => img.id === slot.image!.id);

      return (
        <ImageCard
          image={imageWithUrl || slot.image}
          type="generated"
        />
      );
    }

    // Otherwise render placeholder/generating state
    return (
      <div className="relative group">
        <div className={cn(
          "relative rounded-lg border overflow-hidden",
          isError ? "bg-destructive/5 border-destructive/20" : "bg-muted/50"
        )}>
          <div className={cn(
            "w-full h-48 flex items-center justify-center",
            isError
              ? "bg-gradient-to-br from-destructive/10 to-destructive/5"
              : "bg-gradient-to-br from-muted to-muted/80"
          )}>
            <div className="text-center space-y-3">
              {isError ? (
                <div className="relative">
                  <X className="h-8 w-8 mx-auto text-destructive" />
                  <div className="absolute inset-0 rounded-full border-2 border-destructive/20"></div>
                </div>
              ) : (
                <div className="relative">
                  <Loader2 className="h-8 w-8 animate-smooth-spin mx-auto text-muted-foreground" />
                </div>
              )}
              <div className="space-y-1">
                <p className={cn(
                  "text-sm font-medium",
                  isError ? "text-destructive" : "text-muted-foreground"
                )}>
                  {isError ? 'Generation Failed' : isGenerating ? 'Generating...' : 'Pending...'}
                </p>
                {isGenerating && (
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formattedTime}s</span>
                  </div>
                )}
                {isError && slot.error && (
                  <p className="text-xs text-destructive/80 max-w-32 truncate">
                    {slot.error}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Subtle cancel button for active generations */}
          {onCancelGeneration && isGenerating && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onCancelGeneration(slot.id)}
                className="h-6 w-6 p-0 bg-black/20 hover:bg-black/40 text-white"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Generation badge */}
          <div className={cn(
            "absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm",
            isError
              ? "bg-destructive/90 text-destructive-foreground"
              : isCompleted
              ? "bg-green-500/90 text-white"
              : "bg-blue-500/90 text-white"
          )}>
            {isError ? 'Failed' : isCompleted ? 'Complete' : isGenerating ? 'Generating' : 'Pending'} #{slot.id.slice(-4)}
          </div>
        </div>

        {/* Generation metadata */}
        <div className="mt-3 space-y-1">
          <p className="text-sm font-medium truncate" title={slot.prompt}>
            {slot.prompt.length > 30 ? `${slot.prompt.slice(0, 30)}...` : slot.prompt}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Image #{slot.imageIndex + 1} from batch</span>
            {isGenerating && <span>Started {formattedTime}s ago</span>}
          </div>
        </div>
      </div>
    );
  };

  const ImageCard = ({
    image,
    type
  }: {
    image: StoredImage | GeneratedImage;
    type: 'reference' | 'generated'
  }) => (
    <div className="relative group">
      <div className="relative rounded-lg border overflow-hidden bg-muted">
        {image.url ? (
          <img
            src={image.url}
            alt={image.filename}
            className="w-full h-48 object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-48 flex items-center justify-center bg-muted">
            <div className="text-center space-y-2">
              <Loader2 className="h-6 w-6 animate-smooth-spin mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Loading...</p>
            </div>
          </div>
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
                  openLightbox(image);
                  onPreview?.(image);
                }}
                className="backdrop-blur-sm"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadImage(image);
                  onDownload?.(image); // Also call the optional callback
                }}
                disabled={isImageDownloading(image.id)}
                className="backdrop-blur-sm"
              >
                {isImageDownloading(image.id) ? (
                  <Loader2 className="h-4 w-4 animate-smooth-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Type badge */}
        <div className={cn(
          "absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm",
          type === 'generated'
            ? "bg-primary/90 text-primary-foreground"
            : "bg-secondary/90 text-secondary-foreground"
        )}>
          {type === 'generated' ? 'Generated' : 'Reference'}
        </div>
      </div>

      {/* Image metadata */}
      <div className="mt-3 space-y-1">
        <p className="text-sm font-medium truncate" title={image.filename}>
          {image.filename}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatFileSize(image.size)}</span>
          {image.dimensions && (
            <span>{image.dimensions.width} × {image.dimensions.height}</span>
          )}
        </div>
        {'createdAt' in image && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(image.createdAt)}</span>
          </div>
        )}
      </div>
    </div>
  );

  const hasImages = generatedImages.length > 0 || imageSlots.length > 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Image Gallery</CardTitle>
          <CardDescription>
            Your reference and generated images
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-smooth-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isGenerating ? 'Generating images...' : 'Loading images...'}
              </p>
              {isGenerating && elapsedTime > 0 && (
                <p className="text-xs text-muted-foreground">
                  Elapsed: {(elapsedTime / 1000).toFixed(1)}s
                </p>
              )}
              {generationError && (
                <p className="text-sm text-destructive">
                  {generationError}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasImages) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Image Gallery</CardTitle>
          <CardDescription>
            Your reference and generated images will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <FileImage className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <div className="space-y-1">
                <p className="text-sm font-medium">No images yet</p>
                <p className="text-xs text-muted-foreground">
                  Generate new images to get started
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">Image Gallery</CardTitle>
        <CardDescription className="text-xl">
          {(() => {
            const activeSlots = imageSlots.filter(slot => slot.status === 'generating' || slot.status === 'pending').length;
            const completedSlots = imageSlots.filter(slot => slot.status === 'completed').length;

            const parts = [];
            if (activeSlots > 0) parts.push(`${activeSlots} generating`);
            if (completedSlots > 0) parts.push(`${completedSlots} generated`);

            return parts.join(', ') || 'Your generated images will appear here';
          })()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Image Slots - Each slot manages its own state */}
        {imageSlots.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 text-foreground">
              Generated Images ({imageSlots.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Render each slot - completed ones show images, others show placeholders */}
              {imageSlots.map((slot) => (
                <ImageSlotCard
                  key={slot.id}
                  slot={slot}
                />
              ))}
            </div>
          </div>
        )}


        {/* Image Lightbox */}
        {allImages.length > 0 && (
          <ImageLightbox
            images={allImages}
            currentIndex={lightboxIndex}
            isOpen={lightboxOpen}
            onClose={() => setLightboxOpen(false)}
            onIndexChange={setLightboxIndex}
          />
        )}
      </CardContent>
    </Card>
  );
}