import { useState } from 'react';
import { Download, Eye, Calendar, FileImage, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useImageDownload } from '@/hooks/use-image-download';
import { ImageLightbox } from './image-lightbox';
import type { ImageGalleryProps, StoredImage, GeneratedImage } from '@/types/ai-image';

export function ImageGallery({
  referenceImages,
  generatedImages,
  onDownload,
  onPreview,
  loading = false,
  isGenerating = false,
  elapsedTime = 0,
  generationError
}: ImageGalleryProps) {
  const { downloadImage, isImageDownloading } = useImageDownload();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Combine all images for lightbox navigation
  const allImages = [...generatedImages, ...referenceImages];
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
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
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
                  <Loader2 className="h-4 w-4 animate-spin" />
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

  const hasImages = referenceImages.length > 0 || generatedImages.length > 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Image Gallery</CardTitle>
          <CardDescription>
            Your reference and generated images
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
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
          <CardTitle className="text-lg">Image Gallery</CardTitle>
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
                  Upload reference images or generate new ones to get started
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
        <CardTitle className="text-lg">Image Gallery</CardTitle>
        <CardDescription>
          {generatedImages.length > 0 && referenceImages.length > 0 &&
            `${generatedImages.length} generated, ${referenceImages.length} reference`
          }
          {generatedImages.length > 0 && referenceImages.length === 0 &&
            `${generatedImages.length} generated image${generatedImages.length !== 1 ? 's' : ''}`
          }
          {generatedImages.length === 0 && referenceImages.length > 0 &&
            `${referenceImages.length} reference image${referenceImages.length !== 1 ? 's' : ''}`
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Generated Images Section */}
        {generatedImages.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 text-foreground">
              Generated Images ({generatedImages.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedImages.map((image) => (
                <ImageCard
                  key={image.id}
                  image={image}
                  type="generated"
                />
              ))}
            </div>
          </div>
        )}

        {/* Reference Images Section */}
        {referenceImages.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 text-foreground">
              Reference Images ({referenceImages.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {referenceImages.map((image) => (
                <ImageCard
                  key={image.id}
                  image={image}
                  type="reference"
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