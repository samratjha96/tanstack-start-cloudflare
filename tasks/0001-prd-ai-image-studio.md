# AI Image Studio - Product Requirements Document

## Introduction/Overview

The AI Image Studio is a feature that allows users to generate AI-powered images using Google's Gemini 2.5 Flash Image Preview model. Users can optionally upload reference images and provide text prompts to generate custom images. The feature provides a clean, intuitive interface for AI image generation with immediate preview and download capabilities.

## Goals

1. **Streamlined Image Generation**: Provide a simple, user-friendly interface for AI image generation
2. **Reference Image Support**: Allow users to upload up to 5 reference images to guide generation
3. **Flexible Generation**: Support generating 1-5 images per request based on user preference
4. **Immediate Access**: Enable instant preview and download of all images (reference and generated)
5. **Performance**: Ensure fast, responsive experience with progress indicators during generation
6. **Storage Integration**: Utilize existing R2 bucket infrastructure for reliable image storage

## User Stories

**As a user, I want to:**
- Navigate to `/studio` to access the AI image generation interface
- Input my Google API key inline without needing to store it permanently
- Upload 0-5 reference images (up to 5MB each) in any common format to guide generation
- Enter a text prompt describing what I want to generate
- Choose how many images to generate (1-5) in a single request
- See a progress indicator with timer while images are being generated
- Preview all uploaded reference images before generation
- View generated images immediately after creation
- Download individual images (both reference and generated) with a single click
- Receive clear, user-friendly error messages if generation fails

## Functional Requirements

### Navigation & Access
1. The system must provide a top-level navigation link to `/studio`
2. The system must render the AI Image Studio interface at the `/studio` route

### API Key Management
3. The system must provide an inline input field for Google API key entry
4. The system must not persist the API key beyond the current session
5. The system must validate the API key format before allowing generation

### Reference Image Upload
6. The system must allow users to upload 0-5 reference images
7. The system must accept common image formats (jpg, png, webp, gif, etc.)
8. The system must enforce a maximum file size of 5MB per image
9. The system must display preview thumbnails of uploaded reference images
10. The system must allow users to remove uploaded reference images before generation
11. The system must keep reference images in memory until generation is triggered

### Text Prompt Input
12. The system must provide a text area for prompt input
13. The system must allow multi-line prompts with reasonable character limits

### Generation Configuration
14. The system must allow users to select the number of images to generate (1-5)
15. The system must use the Gemini 2.5 Flash Image Preview model for generation
16. The system must not expose advanced parameters (aspect ratio, style settings, etc.)

### Image Generation Process
17. The system must validate all inputs before starting generation
18. The system must display a progress indicator with elapsed time during generation
19. The system must use TanStack Start server functions for all API calls
20. The system must store reference images in R2 with "reference_image" prefix upon generation start
21. The system must store generated images in R2 with "generations" prefix
22. The system must use the existing IMAGE_STORAGE R2 bucket configuration

### Image Display & Download
23. The system must display generated images in a responsive grid layout
24. The system must provide individual download buttons for each image
25. The system must support image preview/lightbox functionality for all images
26. The system must display reference images alongside generated images for comparison
27. The system must show image metadata (size, format) in previews

### Error Handling
28. The system must display user-friendly error messages for API failures
29. The system must handle network timeouts gracefully
30. The system must validate file uploads and show appropriate error messages
31. The system must handle quota/rate limiting errors from Google API

## Non-Goals (Out of Scope)

- **Session Persistence**: No need to maintain sessions across browser refreshes
- **Generation History**: No storage or retrieval of previous generation sessions
- **Image Regeneration**: No ability to regenerate images with same parameters
- **Advanced Parameters**: No exposure of aspect ratio, style, or other advanced settings
- **Usage Tracking**: No quota tracking or usage analytics for API calls
- **Bulk Operations**: No bulk download of multiple images at once
- **Image Editing**: No built-in image editing or modification capabilities
- **User Authentication**: No user accounts or authentication required
- **Image Sharing**: No social sharing or public gallery features

## Design Considerations

### UI/UX Requirements
- Clean, modern interface using Shadcn UI components
- Responsive design that works on desktop and mobile
- Intuitive drag-and-drop for reference image uploads
- Clear visual feedback for all user actions
- Progressive enhancement approach for uploads and generation

### Component Structure
- Dedicated route component for `/studio`
- Reusable components for image upload, preview, and download
- Modal/lightbox component for image previews
- Progress indicator component with timer functionality

## Technical Considerations

### Server Functions Architecture
- Follow existing patterns from `analytics-functions.ts`
- Use proper input validation with Zod schemas
- Implement error handling consistent with existing server functions
- Use TanStack Start's `createServerFn` for all backend operations

### R2 Storage Integration
- Utilize existing `IMAGE_STORAGE` bucket from wrangler.jsonc
- Implement proper file naming conventions with prefixes
- Use appropriate metadata for stored images
- Handle concurrent uploads efficiently

### AI SDK Integration
- Use `@ai-sdk/google` package for Gemini integration
- Implement the `experimental_generateImage` function
- Handle file uploads and multimodal prompts correctly
- Process API responses and extract generated images

### Performance Optimizations
- Implement image compression for uploads if needed
- Use efficient image preview generation
- Minimize re-renders during generation process
- Optimize R2 upload/download operations

## Success Metrics

1. **User Experience**: Users can successfully generate images within 30 seconds of uploading references and entering prompts
2. **Error Rate**: Less than 5% of generation requests result in user-facing errors
3. **Upload Success**: 99%+ of valid image uploads complete successfully
4. **Performance**: Page loads within 2 seconds, image previews render within 1 second
5. **API Integration**: Successful integration with Gemini 2.5 Flash Image Preview model

## Open Questions

1. Should we implement any client-side image compression for large uploads?
2. Do we need any specific image format conversion for the Gemini API?
3. Should we add any prompt suggestions or examples to help users get started?
4. Do we want to implement any basic prompt validation or enhancement?
5. Should we consider adding a simple gallery view of generated images within the session?