import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { env } from "cloudflare:workers";

// List all objects in analytics-data bucket with folder structure
const ListBucketContentsSchema = z.object({
  prefix: z.string().optional().default(''),
  delimiter: z.string().optional().default('/'),
  maxKeys: z.number().min(1).max(1000).optional().default(100)
})

type ListBucketContentsInput = z.infer<typeof ListBucketContentsSchema>

export const listBucketContents = createServerFn({ method: 'POST' })
  .inputValidator((data: ListBucketContentsInput) => ListBucketContentsSchema.parse(data))
  .handler(async (ctx) => {
    const startTime = Date.now()
    
    try {
      const bucket = env.IMAGE_STORAGE
      
      const options: any = {
        prefix: ctx.data.prefix,
        delimiter: ctx.data.delimiter,
        limit: ctx.data.maxKeys
      }
      
      const result = await bucket.list(options)
      
      // Separate folders and files
      const folders = result.delimitedPrefixes?.map((prefix: string) => ({
        name: prefix.replace(ctx.data.prefix, '').replace('/', ''),
        path: prefix,
        type: 'folder' as const,
        size: 0,
        lastModified: null
      })) || []
      
      const files = result.objects?.map((obj: any) => {
        const name = obj.key.replace(ctx.data.prefix, '')
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)
        
        return {
          name,
          path: obj.key,
          type: 'file' as const,
          size: obj.size,
          lastModified: obj.uploaded,
          isImage,
          etag: obj.etag
        }
      }) || []
      
      const duration = Date.now() - startTime
      
      return {
        success: true,
        folders,
        files,
        truncated: result.truncated || false,
        currentPath: ctx.data.prefix,
        duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error('Failed to list bucket contents:', error)
      
      return {
        success: false,
        error: String(error),
        folders: [],
        files: [],
        duration
      }
    }
  })

// Get signed URL for R2 object (for image preview)
const GetObjectUrlSchema = z.object({
  key: z.string().min(1),
  expiresIn: z.number().min(60).max(3600).optional().default(3600) // 1 hour default
})

type GetObjectUrlInput = z.infer<typeof GetObjectUrlSchema>

export const getObjectUrl = createServerFn({ method: 'POST' })
  .inputValidator((data: GetObjectUrlInput) => GetObjectUrlSchema.parse(data))
  .handler(async (ctx) => {
    const { env } = await import('cloudflare:workers')
    const startTime = Date.now()
    
    try {
      const bucket = env.IMAGE_STORAGE
      const object = await bucket.get(ctx.data.key)
      
      if (!object) {
        return { success: false, error: 'Object not found' }
      }
      
      // For images, we'll return the object data as base64
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(ctx.data.key)
      
      if (isImage) {
        // For large images, limit size and use efficient conversion
        if (object.size > 5 * 1024 * 1024) { // 5MB limit
          return {
            success: false,
            error: 'Image too large for preview (>5MB)',
            size: object.size,
            duration: Date.now() - startTime
          }
        }
        
        const arrayBuffer = await object.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        const mimeType = object.httpMetadata?.contentType || 'image/jpeg'
        
        const duration = Date.now() - startTime
        
        return {
          success: true,
          url: `data:${mimeType};base64,${base64}`,
          size: object.size,
          contentType: mimeType,
          duration
        }
      }
      
      // For non-images, return text content
      const content = await object.text()
      const duration = Date.now() - startTime
      
      return {
        success: true,
        content,
        size: object.size,
        contentType: object.httpMetadata?.contentType || 'text/plain',
        duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error('Failed to get object URL:', error)
      
      return {
        success: false,
        error: String(error),
        duration
      }
    }
  })
