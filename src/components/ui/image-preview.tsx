import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Download, X, Loader2, Image as ImageIcon } from "lucide-react";
import { getObjectUrl } from "@/core/functions/explorer-functions";
import { formatFileSize, downloadFile } from "@/lib/file-utils";
import { cn } from "@/lib/utils";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName: string;
  fileSize: number;
}

const ImageModal = React.memo(function ImageModal({
  isOpen,
  onClose,
  imageUrl,
  fileName,
  fileSize,
}: ImageModalProps) {
  const [isLoading, setIsLoading] = React.useState(true);

  const handleDownload = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Download button clicked!');
    downloadFile(imageUrl, fileName);
  }, [imageUrl, fileName]);

  const handleClose = React.useCallback((e: React.MouseEvent) => {
    console.log('Close button clicked!', e);
    e.preventDefault();
    e.stopPropagation();
    onClose();
  }, [onClose]);

  const handleImageLoad = React.useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleBackdropClick = React.useCallback((e: React.MouseEvent) => {
    console.log('Backdrop clicked', e.target, e.currentTarget);
    if (e.target === e.currentTarget) {
      console.log('Closing modal');
      onClose();
    }
  }, [onClose]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Reset loading state when modal opens or image changes
  React.useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
    }
  }, [isOpen, imageUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col">
      {/* Header with controls */}
      <div className="flex-none p-4">
        <div className="bg-black/70 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-center justify-between text-white">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-medium truncate">{fileName}</h2>
              <p className="text-sm text-white/80 mt-1">{formatFileSize(fileSize)}</p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownload}
                className="bg-white/15 hover:bg-white/25 text-white border-white/20"
              >
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Download</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClose}
                className="bg-white/15 hover:bg-white/25 text-white border-white/20 relative z-10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Image container with backdrop click */}
      <div 
        className="flex-1 flex items-center justify-center p-4 relative cursor-pointer"
        onClick={handleBackdropClick}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
        <img
          src={imageUrl}
          alt={fileName}
          className={cn(
            "max-w-full max-h-full object-contain transition-all duration-500 ease-out cursor-default",
            isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          )}
          onLoad={handleImageLoad}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
});

const LoadingFallback = React.memo(function LoadingFallback({ 
  className 
}: { 
  className: string 
}) {
  return (
    <div className={cn("flex items-center justify-center bg-muted/50 rounded-lg border", className)}>
      <div className="flex flex-col items-center gap-2 p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading image...</span>
      </div>
    </div>
  );
});

const ErrorFallback = React.memo(function ErrorFallback({ 
  fileName, 
  showFileName, 
  className 
}: { 
  fileName: string; 
  showFileName: boolean; 
  className: string; 
}) {
  return (
    <div className={cn("flex items-center justify-center bg-muted/50 rounded-lg border", className)}>
      <div className="flex flex-col items-center gap-2 p-8">
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Failed to load image</span>
        {showFileName && (
          <span className="text-xs text-muted-foreground truncate max-w-full">{fileName}</span>
        )}
      </div>
    </div>
  );
});

interface R2ImagePreviewProps {
  bucket?: 'ANALYTICS_STORAGE' | 'IMAGE_STORAGE';
  objectKey: string;
  className?: string;
  previewClassName?: string;
  alt?: string;
  showFileName?: boolean;
  showFileSize?: boolean;
}

export const R2ImagePreview = React.memo(function R2ImagePreview({
  bucket = 'IMAGE_STORAGE',
  objectKey,
  className = "",
  previewClassName = "",
  alt,
  showFileName = false,
  showFileSize = false,
}: R2ImagePreviewProps) {
  const [modalOpen, setModalOpen] = React.useState(false);

  const fileName = React.useMemo(() => 
    objectKey.split('/').pop() || objectKey, 
    [objectKey]
  );

  const {
    data: imageData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["r2-image", bucket, objectKey],
    queryFn: () => getObjectUrl({ data: { key: objectKey, expiresIn: 3600 } }),
    enabled: !!objectKey,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });

  const handleOpenModal = React.useCallback(() => {
    setModalOpen(true);
  }, []);

  const handleCloseModal = React.useCallback(() => {
    setModalOpen(false);
  }, []);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpenModal();
    }
  }, [handleOpenModal]);

  if (isLoading) {
    return <LoadingFallback className={className} />;
  }

  if (error || !imageData?.success || !imageData.url?.startsWith('data:image')) {
    return (
      <ErrorFallback 
        fileName={fileName} 
        showFileName={showFileName} 
        className={className} 
      />
    );
  }

  return (
    <>
      <div 
        className={cn(
          "relative group cursor-pointer overflow-hidden rounded-lg border bg-muted/50",
          "transition-all duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          className
        )}
        onClick={handleOpenModal}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
      >
        <div className={cn("aspect-square", previewClassName)}>
          <img
            src={imageData.url}
            alt={alt || fileName}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
          />
        </div>
        
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="text-white text-sm font-medium">Click to view full size</div>
        </div>

        {(showFileName || showFileSize) && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            {showFileName && (
              <div className="text-white text-sm font-medium truncate">{fileName}</div>
            )}
            {showFileSize && imageData.size && (
              <div className="text-white/80 text-xs">{formatFileSize(imageData.size)}</div>
            )}
          </div>
        )}
      </div>

      <ImageModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        imageUrl={imageData.url}
        fileName={fileName}
        fileSize={imageData.size || 0}
      />
    </>
  );
});

// Export ImagePreview as the new R2ImagePreview component
export { R2ImagePreview as ImagePreview };