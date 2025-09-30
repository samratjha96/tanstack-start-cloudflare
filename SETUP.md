# Image Generation Studio Setup Guide

## 🎨 Overview
A comprehensive image generation studio built with TanStack Start, Shadcn/UI, and Google's Imagen AI. Users can upload multiple images, create AI-generated compositions, and manage their creative sessions.

## 🚀 Previous Analytics Feature
This app also includes a simple analytics system that tracks server function executions using Cloudflare KV and exports data to R2 storage.

## Prerequisites

1. Cloudflare account (free plan supported)
2. Wrangler CLI installed and authenticated
3. Google AI Studio account for API access

## 🚀 Image Studio Setup Steps

### 1. Create Cloudflare Resources (Automated)

Run the setup script to create all required resources:

```bash
# Run the automated setup script
./setup-cloudflare.sh
```

This creates:
- `ANALYTICS_CACHE` KV namespace (existing analytics feature)
- `IMAGE_STUDIO_CACHE` KV namespace (new image studio)
- `analytics-data` R2 bucket (existing analytics feature)  
- `image-studio-data` R2 bucket (new image studio)

### 2. Update wrangler.jsonc

After running the script, update `wrangler.jsonc` with the KV namespace IDs shown in the output:

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "ANALYTICS_CACHE",
      "id": "existing-analytics-id"
    },
    {
      "binding": "IMAGE_STUDIO_CACHE", 
      "id": "new-image-studio-id-from-script-output"
    }
  ],
  "r2_buckets": [
    {
      "binding": "ANALYTICS_STORAGE",
      "bucket_name": "analytics-data"
    },
    {
      "binding": "IMAGE_STUDIO_STORAGE",
      "bucket_name": "image-studio-data"
    }
  ]
}
```

### 3. Google AI API Setup

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Update `wrangler.jsonc` with your API key:

```jsonc
"vars": {
  "GOOGLE_GENERATIVE_AI_API_KEY": "your-actual-api-key-here"
}
```

### 4. Development

```bash
# Install dependencies (already done)
pnpm install

# Start development server
pnpm dev

# Visit the image studio at:
# http://localhost:3000/studio
```

### 5. Deployment

```bash
# Build and deploy to Cloudflare Workers
pnpm deploy
```

## 🏗 Image Studio Architecture

### Backend (Server Functions)
- **Session Management**: Create and manage user sessions with KV storage
- **File Upload**: Handle multiple image uploads to R2 with validation
- **AI Generation**: Integrate with Google Imagen for image generation
- **Data Retrieval**: Serve images and session data efficiently

### Frontend (Shadcn/UI Components)
- **Session Selector**: Dropdown for managing creative sessions
- **Image Uploader**: Drag & drop interface with preview
- **Image Grid**: Selectable gallery of uploaded images
- **Prompt Input**: Rich text area for generation prompts
- **Results Gallery**: Display and download generated images

### Storage Structure
#### KV Cache Keys:
- `session:{sessionId}:metadata` - Session information
- `session:{sessionId}:images` - Uploaded image metadata
- `session:{sessionId}:generations` - AI generation results
- `sessions:list` - List of all sessions

#### R2 Storage Paths:
- `sessions/{sessionId}/uploads/{imageId}.{ext}` - User uploads
- `sessions/{sessionId}/generated/{jobId}.png` - AI generated images

## 🎯 Image Studio Features

### ✅ Implemented
- **Session Management**: Create, select, and manage creative sessions
- **Multi-File Upload**: Drag & drop with validation and previews
- **Image Gallery**: Responsive grid with selection capabilities
- **AI Integration**: Google Imagen API integration ready
- **Download System**: Download any uploaded or generated image
- **Responsive Design**: Mobile-friendly interface
- **Type Safety**: Full TypeScript integration
- **Error Handling**: Comprehensive error states and messaging
- **Loading States**: Progress indicators and skeleton loaders

### 🔧 Ready to Enhance
- **AI Model Options**: Switch between different Imagen models
- **Batch Generation**: Generate multiple variations at once
- **Image Editing**: Basic crop/resize before generation
- **Prompt Templates**: Pre-built prompt suggestions
- **Sharing**: Share sessions or results publicly
- **User Accounts**: Persistent user sessions across devices

## 🎨 Usage

1. **Create Session**: Start a new creative session or select existing one
2. **Upload Images**: Drag & drop multiple reference images
3. **Select References**: Choose which images to use for generation
4. **Write Prompt**: Describe the desired output image
5. **Generate**: Let AI create your composition
6. **Download**: Save generated images locally

## 🚨 Important Notes

- Replace placeholder KV namespace ID in `wrangler.jsonc`
- Add your Google AI API key to environment variables
- Create R2 bucket before deployment
- The studio is accessible at `/studio` route
- File uploads are limited to images (jpg, png, webp)
- Sessions persist across browser visits

## 🐛 Troubleshooting

**Build Errors**: Run `pnpm build` to check for TypeScript errors
**Upload Failures**: Verify R2 bucket exists and bindings are correct
**Generation Errors**: Check Google AI API key and quota limits
**KV Errors**: Ensure KV namespace ID is correct in wrangler.jsonc

---

The Image Generation Studio is now ready for use! 🎉

## Analytics Dashboard (Previous Feature)

Visit `/analytics` to:
- See real-time execution count
- Export data to R2 storage
- Download previous exports