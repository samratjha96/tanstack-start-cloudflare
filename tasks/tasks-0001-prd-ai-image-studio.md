# AI Image Studio - Task List

## Relevant Files

- `src/routes/studio.tsx` - Main route component for the AI Image Studio interface
- `src/routes/studio.test.tsx` - Unit tests for the studio route
- `src/core/functions/ai-image-functions.ts` - Server functions for AI image generation and storage
- `src/core/functions/ai-image-functions.test.ts` - Unit tests for AI image functions
- `src/components/studio/image-upload.tsx` - Component for reference image upload functionality
- `src/components/studio/image-upload.test.tsx` - Unit tests for image upload component
- `src/components/studio/image-gallery.tsx` - Component for displaying generated and reference images
- `src/components/studio/image-gallery.test.tsx` - Unit tests for image gallery component
- `src/components/studio/generation-progress.tsx` - Component for showing generation progress with timer
- `src/components/studio/generation-progress.test.tsx` - Unit tests for generation progress component
- `src/lib/file-utils.ts` - Utility functions for file validation and processing (already exists)
- `src/lib/ai-utils.ts` - Utility functions for AI SDK integration and image processing (created)
- `src/lib/ai-utils.test.ts` - Unit tests for AI utilities
- `src/types/ai-image.ts` - Comprehensive type definitions for AI image generation (created)

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [x] 1.0 Set up AI SDK Integration and Dependencies
  - [x] 1.1 Install @ai-sdk/google and related dependencies
  - [x] 1.2 Configure AI SDK with Google provider in project
  - [x] 1.3 Create basic type definitions for AI image generation
- [ ] 2.0 Create AI Image Generation Server Functions
  - [ ] 2.1 Create ai-image-functions.ts with image generation server function
  - [ ] 2.2 Implement reference image upload to R2 with proper prefixes
  - [ ] 2.3 Integrate Gemini 2.5 Flash Image Preview model for generation
  - [ ] 2.4 Add error handling and validation for AI API calls
- [ ] 3.0 Build Studio Route and Core UI Components
  - [ ] 3.1 Create /studio route with basic layout
  - [ ] 3.2 Add navigation link to studio in main navigation
  - [ ] 3.3 Create API key input component with validation
  - [ ] 3.4 Create text prompt input component
  - [ ] 3.5 Add generation count selector (1-5 images)
- [ ] 4.0 Implement Image Upload and Management System
  - [ ] 4.1 Create image upload component with drag-and-drop
  - [ ] 4.2 Add file validation (size, format, count limits)
  - [ ] 4.3 Implement image preview thumbnails for reference images
  - [ ] 4.4 Add remove functionality for uploaded reference images
- [ ] 5.0 Create Image Gallery and Download Functionality
  - [ ] 5.1 Create image gallery component for displaying results
  - [ ] 5.2 Implement individual image download functionality
  - [ ] 5.3 Add image preview/lightbox for generated images
  - [ ] 5.4 Create generation progress indicator with timer