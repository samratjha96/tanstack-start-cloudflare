import { createFileRoute } from "@tanstack/react-router";
import { NavigationBar } from "@/components/navigation";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { ImageUpload } from "@/components/studio/image-upload";
import { ImageGallery } from "@/components/studio/image-gallery";
import { useR2Images } from "@/hooks/use-r2-images";
import { useImageGeneration } from "@/hooks/use-image-generation";
import { useReferenceImages } from "@/hooks/use-reference-images";
import { AI_CONFIG } from "@/lib/ai-utils";
import type { ImageGenerationForm, UploadedFile } from "@/types/ai-image";

export const Route = createFileRoute("/studio")({
  component: StudioPage,
});

function StudioPage() {
  const [form, setForm] = useState<ImageGenerationForm>({
    apiKey: "",
    prompt: "",
    imageCount: 1,
    referenceImages: []
  });

  // Manage reference images with optimized uploads
  const {
    referenceImageKeys,
    uploadReferenceImages,
    isUploading: referenceImagesLoading
  } = useReferenceImages({
    onUploadComplete: (images) => {
      console.log('Reference images uploaded:', images);
    },
    onUploadError: (error) => {
      console.error('Reference upload failed:', error);
    }
  });

  // Simplified image generation with slots
  const {
    imageSlots,
    completedImages,
    hasActiveGenerations,
    startBatchGeneration,
    cancelGeneration
  } = useImageGeneration();

  // Load R2 images with proper URLs for display
  const { images: generatedImagesWithUrls, isLoading: generatedImagesLoading } = useR2Images(completedImages);


  const handleFilesChange = (uploadedFiles: UploadedFile[]) => {
    setForm(prev => ({ ...prev, referenceImages: uploadedFiles }));
    
    // Upload reference images to R2 for efficient reuse
    uploadReferenceImages(uploadedFiles);
  };

  const handleGenerate = () => {
    // Prepare files (only valid ones)
    const files: File[] = form.referenceImages.filter((f) => f.isValid).map((f) => f.file);

    // Start batch generation - creates all slots upfront
    startBatchGeneration({
      apiKey: form.apiKey,
      prompt: form.prompt,
      imageCount: form.imageCount,
      referenceImages: files,
      referenceImageKeys // Use pre-uploaded R2 keys for efficiency
    });
  };

  const handleCancelGeneration = (slotId: string) => {
    cancelGeneration(slotId);
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />

      {/* Main Content */}
      <main className="container mx-auto px-6 sm:px-8 lg:px-12 pt-32 pb-20">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <Sparkles className="h-12 w-12 text-primary mr-4" />
              <h1 className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                Dream Canvas
              </h1>
            </div>
            <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Turn your creative visions into amazing artwork with just a few words. Create stunning images from scratch or jazz up your existing photos with simple instructions.
            </p>
          </div>

          {/* Controls bar */}
          <Card className="sticky top-20 z-20 mb-12">
            <CardContent className="py-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-6">
                <div className="flex-1 flex items-center gap-4">
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Google API Key (AIza...)"
                    value={form.apiKey}
                    onChange={(e) => setForm(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="font-mono text-base h-12"
                  />
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={!form.apiKey || !form.prompt || hasActiveGenerations}
                  className="w-full sm:w-auto h-14 px-8"
                  size="lg"
                >
                  {hasActiveGenerations ? (
                    <>
                      <div className="animate-smooth-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full mr-3" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-3" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
            {/* Controls - Left Panel */}
            <div className="xl:col-span-5 space-y-8">
              {/* Prompt Input */}
              <Card className="p-2">
                <CardHeader className="pb-6">
                  <CardTitle className="text-3xl">Generation Prompt</CardTitle>
                  <CardDescription className="text-xl">
                    Describe the image you want to create
                  </CardDescription>
                  <CardAction>
                    <div className="flex items-center gap-3">
                      <Label htmlFor="imageCount" className="text-sm font-medium">Images</Label>
                      <Select
                        value={form.imageCount.toString()}
                        onValueChange={(value) => setForm(prev => ({ ...prev, imageCount: parseInt(value) }))}
                      >
                        <SelectTrigger className="h-12 w-[100px] text-base">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1" className="text-base">1</SelectItem>
                          <SelectItem value="2" className="text-base">2</SelectItem>
                          <SelectItem value="3" className="text-base">3</SelectItem>
                          <SelectItem value="4" className="text-base">4</SelectItem>
                          <SelectItem value="5" className="text-base">5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="prompt" className="text-lg font-medium">Image Description</Label>
                    <Textarea
                      id="prompt"
                      placeholder="A whimsical watercolor garden party with vintage china and wildflowers dancing in the breeze..."
                      value={form.prompt}
                      onChange={(e) => setForm(prev => ({ ...prev, prompt: e.target.value }))}
                      className="h-40 resize-none text-xl leading-relaxed"
                      maxLength={2000}
                    />
                    <div className="flex justify-between text-base text-muted-foreground">
                      <span>Be detailed for better results</span>
                      <span>{form.prompt.length}/2000</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Reference Images Upload */}
              <ImageUpload
                onFilesChange={handleFilesChange}
                maxFiles={AI_CONFIG.maxImages}
                maxFileSize={AI_CONFIG.maxFileSize}
                acceptedFormats={AI_CONFIG.supportedFormats}
                disabled={false}
              />
            </div>

            {/* Results Panel - Right Side */}
            <div className="xl:col-span-7">
              {/* Consolidated Image Gallery with generation states */}
              <ImageGallery
                generatedImages={generatedImagesWithUrls}
                imageSlots={imageSlots}
                onCancelGeneration={handleCancelGeneration}
                loading={generatedImagesLoading || referenceImagesLoading}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}