import { createFileRoute } from "@tanstack/react-router";
import { NavigationBar } from "@/components/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Eye, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/studio/image-upload";
import { ImageGallery } from "@/components/studio/image-gallery";
import { ImageGeneration } from "@/components/studio/image-generation";
import { useR2Images } from "@/hooks/use-r2-images";
import { AI_CONFIG } from "@/lib/ai-utils";
import { generateImages } from "@/core/functions/ai-image-functions";
import type { ImageGenerationForm, UploadedFile, GeneratedImage, StoredImage, ImageGeneration as ImageGenerationType } from "@/types/ai-image";

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

  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [referenceImages, setReferenceImages] = useState<StoredImage[]>([]);
  const [generations, setGenerations] = useState<ImageGenerationType[]>([]);

  // Load R2 images with proper URLs for display
  const { images: generatedImagesWithUrls, isLoading: generatedImagesLoading } = useR2Images(generatedImages);
  const { images: referenceImagesWithUrls, isLoading: referenceImagesLoading } = useR2Images(referenceImages);

  // TanStack Query mutation for image generation
  const generateImagesMutation = useMutation({
    mutationFn: async (data: { generationId: string; apiKey: string; prompt: string; count: number; referenceImages: File[] }) => {
      return await generateImages({ data: { apiKey: data.apiKey, prompt: data.prompt, count: data.count, referenceImages: data.referenceImages } });
    },
    onSuccess: (response, variables) => {
      const generationId = variables.generationId;
      
      if (response.success) {
        // Update the generation with completed status and images
        setGenerations(prev => prev.map(gen => 
          gen.id === generationId 
            ? { 
                ...gen, 
                status: 'completed' as const,
                images: response.images || [],
                referenceImages: response.referenceImages
              }
            : gen
        ));
        
        // Also update the main state for backward compatibility with ImageGallery
        if (response.referenceImages && response.referenceImages.length > 0) {
          setReferenceImages(response.referenceImages);
        }
        setGeneratedImages(prev => [...prev, ...(response.images || [])]);
      }
    },
    onError: (error, variables) => {
      const generationId = variables.generationId;
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      
      // Update the generation with error status
      setGenerations(prev => prev.map(gen => 
        gen.id === generationId 
          ? { ...gen, status: 'error' as const, error: errorMessage }
          : gen
      ));
      
      console.error('Generation failed:', error);
    }
  });

  const handleFilesChange = (uploadedFiles: UploadedFile[]) => {
    setForm(prev => ({ ...prev, referenceImages: uploadedFiles }));

    // Mirror into preview-ready StoredImage-like objects for the right panel
    const previews: StoredImage[] = uploadedFiles.map((u) => ({
      id: u.id,
      url: u.preview,
      filename: u.file.name,
      originalName: u.file.name,
      format: u.file.type as StoredImage['format'],
      size: u.file.size,
      r2Key: "",
      type: "reference",
    }));
    setReferenceImages(previews);
  };

  const handleGenerate = () => {
    // Prepare files (only valid ones)
    const files: File[] = form.referenceImages.filter((f) => f.isValid).map((f) => f.file);

    // Create a new generation
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newGeneration: ImageGenerationType = {
      id: generationId,
      prompt: form.prompt,
      imageCount: form.imageCount,
      startTime: Date.now(),
      status: 'generating'
    };

    // Add generation to the list and start generating
    setGenerations(prev => [newGeneration, ...prev]);
    
    generateImagesMutation.mutate({
      generationId,
      apiKey: form.apiKey,
      prompt: form.prompt,
      count: form.imageCount,
      referenceImages: files,
    });
  };

  const handleCancelGeneration = (generationId: string) => {
    // For now, just mark as cancelled since we can't actually cancel the API call
    setGenerations(prev => prev.map(gen => 
      gen.id === generationId 
        ? { ...gen, status: 'error' as const, error: 'Cancelled by user' }
        : gen
    ));
  };

  const handleRetryGeneration = (generationId: string) => {
    const generation = generations.find(gen => gen.id === generationId);
    if (!generation) return;

    // Reset the generation status and start time
    setGenerations(prev => prev.map(gen => 
      gen.id === generationId 
        ? { ...gen, status: 'generating' as const, startTime: Date.now(), error: undefined }
        : gen
    ));

    // Retry with the same parameters
    generateImagesMutation.mutate({
      generationId,
      apiKey: form.apiKey, // Note: This might not be the original API key
      prompt: generation.prompt,
      count: generation.imageCount,
      referenceImages: [], // Note: We don't have access to original files
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                AI Image Studio
              </h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Generate stunning images using Google's Gemini 2.5 Flash Image Preview model. Create from text prompts or edit existing images with natural language instructions.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Generation Controls - Left Panel */}
            <div className="lg:col-span-1 space-y-6">
              {/* API Key Input */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">API Configuration</CardTitle>
                  <CardDescription>
                    Enter your Google API key to start generating images
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">Google API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="AIza..."
                      value={form.apiKey}
                      onChange={(e) => setForm(prev => ({ ...prev, apiKey: e.target.value }))}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Your API key is not stored and only used for this session
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Prompt Input */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Generation Prompt</CardTitle>
                  <CardDescription>
                    Describe the image you want to create
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="prompt">Image Description</Label>
                    <Textarea
                      id="prompt"
                      placeholder="A futuristic cityscape at sunset with flying cars and neon lights..."
                      value={form.prompt}
                      onChange={(e) => setForm(prev => ({ ...prev, prompt: e.target.value }))}
                      className="h-32 resize-none"
                      maxLength={2000}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Be detailed for better results</span>
                      <span>{form.prompt.length}/2000</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Generation Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Generation Settings</CardTitle>
                  <CardDescription>
                    Configure how many images to generate
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="imageCount">Number of Images</Label>
                    <Select
                      value={form.imageCount.toString()}
                      onValueChange={(value) => setForm(prev => ({ ...prev, imageCount: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 image</SelectItem>
                        <SelectItem value="2">2 images</SelectItem>
                        <SelectItem value="3">3 images</SelectItem>
                        <SelectItem value="4">4 images</SelectItem>
                        <SelectItem value="5">5 images</SelectItem>
                      </SelectContent>
                    </Select>
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

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={!form.apiKey || !form.prompt || generateImagesMutation.isPending}
                className="w-full h-12 text-base"
                size="lg"
              >
                {generateImagesMutation.isPending ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generate Images
                  </>
                )}
              </Button>
            </div>

            {/* Results Panel - Right Side */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active Generations */}
              {generations.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Generations</h2>
                    <span className="text-sm text-muted-foreground">
                      {generations.filter(g => g.status === 'generating').length} active
                    </span>
                  </div>
                  {generations.map((generation) => (
                    <ImageGeneration
                      key={generation.id}
                      generation={generation}
                      onCancel={handleCancelGeneration}
                      onRetry={handleRetryGeneration}
                      onImagePreview={() => {}} // Handled by ImageGeneration component's lightbox
                      onImageDownload={() => {}} // Handled by ImageGeneration component's download
                    />
                  ))}
                </div>
              )}

              {/* Reference Images Preview */}
              {referenceImages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Reference Images</CardTitle>
                    <CardDescription>
                      Images used for generation reference
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {referenceImages.map((image, index) => (
                        <div key={index} className="relative">
                          <div className="relative group">
                            <img
                              src={image.url}
                              alt={image.filename}
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <div className="flex space-x-2">
                                <Button size="sm" variant="secondary">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Image Gallery */}
              <ImageGallery
                referenceImages={referenceImagesWithUrls}
                generatedImages={generatedImagesWithUrls}
                loading={generatedImagesLoading || referenceImagesLoading}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}