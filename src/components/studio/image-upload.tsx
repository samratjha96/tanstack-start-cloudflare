import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Eye, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { validateImageFile } from '@/lib/ai-utils';
import { ImageLightbox } from '@/components/studio/image-lightbox';
import type { UploadedFile, ImageUploadProps, StoredImage } from '@/types/ai-image';

export function ImageUpload({
  onFilesChange,
  maxFiles,
  maxFileSize,
  acceptedFormats,
  disabled = false
}: ImageUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createFilePreview = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  }, []);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setIsUploading(true);
    const fileArray = Array.from(files);
    const newFiles: UploadedFile[] = [];

    // Check if adding these files would exceed the limit
    if (uploadedFiles.length + fileArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed. You can upload ${maxFiles - uploadedFiles.length} more files.`);
      setIsUploading(false);
      return;
    }

    for (const file of fileArray) {
      const validation = validateImageFile(file);
      const preview = await createFilePreview(file);

      const uploadedFile: UploadedFile = {
        file,
        preview,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        isValid: validation.isValid,
        validationError: validation.error
      };

      newFiles.push(uploadedFile);
    }

    const updatedFiles = [...uploadedFiles, ...newFiles];
    setUploadedFiles(updatedFiles);
    onFilesChange(updatedFiles);
    setIsUploading(false);
  }, [uploadedFiles, maxFiles, onFilesChange, createFilePreview]);

  const removeFile = useCallback((fileId: string) => {
    const updatedFiles = uploadedFiles.filter(f => f.id !== fileId);
    setUploadedFiles(updatedFiles);
    onFilesChange(updatedFiles);
  }, [uploadedFiles, onFilesChange]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  }, [disabled, isUploading, processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const openFileDialog = useCallback(() => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled, isUploading]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  // Convert uploaded files to StoredImage format for the lightbox
  const lightboxImages: StoredImage[] = uploadedFiles.map((file, index) => ({
    id: file.id,
    filename: file.file.name,
    url: file.preview,
    size: file.file.size,
    dimensions: { width: 0, height: 0 }, // We don't have dimensions for uploaded files
    mimeType: file.file.type
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">Reference Images</CardTitle>
        <CardDescription className="text-xl">
          Upload images for editing or style reference (optional)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-accent/5",
            disabled && "opacity-50 cursor-not-allowed",
            isUploading && "opacity-50 cursor-wait"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedFormats.join(',')}
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled || isUploading}
          />

          {isUploading ? (
            <div className="space-y-2">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-muted-foreground">Processing files...</p>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-base text-muted-foreground mb-3">
                {dragActive
                  ? "Drop images here"
                  : "Drag and drop images here, or click to select"
                }
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Maximum {maxFiles} images, {formatFileSize(maxFileSize)} each
              </p>
              <p className="text-sm text-muted-foreground">
                Supported: {acceptedFormats.map(format => format.split('/')[1]).join(', ').toUpperCase()}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                disabled={disabled || uploadedFiles.length >= maxFiles}
              >
                Choose Files
              </Button>
            </>
          )}
        </div>

        {/* File Counter */}
        {uploadedFiles.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            {uploadedFiles.length} of {maxFiles} files uploaded
          </div>
        )}

        {/* Preview Grid */}
        {uploadedFiles.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {uploadedFiles.map((uploadedFile, index) => (
              <div key={uploadedFile.id} className="relative group">
                <div className={cn(
                  "relative rounded-lg border overflow-hidden",
                  !uploadedFile.isValid && "border-destructive"
                )}>
                  <img
                    src={uploadedFile.preview}
                    alt={uploadedFile.file.name}
                    className="w-full h-32 object-cover"
                  />

                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          openLightbox(index);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(uploadedFile.id);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Error indicator */}
                  {!uploadedFile.isValid && (
                    <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                  )}
                </div>

                {/* File info */}
                <div className="mt-2 px-1">
                  <p className="text-xs font-medium truncate" title={uploadedFile.file.name}>
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(uploadedFile.file.size)}
                  </p>

                  {/* Validation error */}
                  {!uploadedFile.isValid && uploadedFile.validationError && (
                    <p className="text-xs text-destructive mt-1">
                      {uploadedFile.validationError}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Clear all button */}
        {uploadedFiles.length > 0 && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setUploadedFiles([]);
                onFilesChange([]);
              }}
              className="w-full"
            >
              Clear All Images
            </Button>
          </div>
        )}
      </CardContent>

      {/* Image Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={closeLightbox}
        onIndexChange={setLightboxIndex}
      />
    </Card>
  );
}