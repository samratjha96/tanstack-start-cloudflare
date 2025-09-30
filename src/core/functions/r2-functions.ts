import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const baseFunction = createServerFn()

// List objects in R2 bucket
const ListObjectsSchema = z.object({
  bucket: z.enum(['ANALYTICS_STORAGE', 'IMAGE_STORAGE']),
  prefix: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(50)
})

type ListObjectsInput = z.infer<typeof ListObjectsSchema>

export const listR2Objects = baseFunction
  .inputValidator((data: ListObjectsInput) => ListObjectsSchema.parse(data))
  .handler(async (ctx) => {
    const { env } = await import('cloudflare:workers')
    const startTime = Date.now()
    
    try {
      const bucket = env[ctx.data.bucket]
      const options: any = {}
      
      if (ctx.data.prefix) {
        options.prefix = ctx.data.prefix
      }
      
      const list = await bucket.list(options)
      
      const objects = list.objects?.slice(0, ctx.data.limit).map((obj: any) => ({
        key: obj.key,
        size: obj.size,
        etag: obj.etag,
        uploaded: obj.uploaded,
        customMetadata: obj.customMetadata || {}
      })) || []
      
      const duration = Date.now() - startTime
      
      return {
        success: true,
        objects,
        truncated: list.truncated || false,
        count: objects.length,
        duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      
      console.error('Failed to list R2 objects:', error)
      return {
        success: false,
        error: String(error),
        objects: [],
        duration
      }
    }
  })

// Get object from R2
const GetObjectSchema = z.object({
  bucket: z.enum(['ANALYTICS_STORAGE', 'IMAGE_STORAGE']),
  key: z.string().min(1)
})

type GetObjectInput = z.infer<typeof GetObjectSchema>

export const getR2Object = baseFunction
  .inputValidator((data: GetObjectInput) => GetObjectSchema.parse(data))
  .handler(async (ctx) => {
    const { env } = await import('cloudflare:workers')
    const startTime = Date.now()
    
    try {
      const bucket = env[ctx.data.bucket]
      const object = await bucket.get(ctx.data.key)
      
      if (!object) {
        return { success: false, error: 'Object not found' }
      }
      
      const content = await object.text()
      const duration = Date.now() - startTime
      
      return {
        success: true,
        key: ctx.data.key,
        content,
        size: object.size,
        etag: object.etag,
        httpMetadata: object.httpMetadata || {},
        customMetadata: object.customMetadata || {},
        duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      
      console.error('Failed to get R2 object:', error)
      return {
        success: false,
        error: String(error),
        duration
      }
    }
  })

// Put object to R2
const PutObjectSchema = z.object({
  bucket: z.enum(['ANALYTICS_STORAGE', 'IMAGE_STORAGE']),
  key: z.string().min(1),
  content: z.string(),
  contentType: z.string().optional().default('text/plain'),
  metadata: z.record(z.string(), z.string()).optional()
})

type PutObjectInput = z.infer<typeof PutObjectSchema>

export const putR2Object = baseFunction
  .inputValidator((data: PutObjectInput) => PutObjectSchema.parse(data))
  .handler(async (ctx) => {
    const { env } = await import('cloudflare:workers')
    const startTime = Date.now()
    
    try {
      const bucket = env[ctx.data.bucket]
      
      const options: any = {
        httpMetadata: {
          contentType: ctx.data.contentType
        }
      }
      
      if (ctx.data.metadata) {
        options.customMetadata = ctx.data.metadata
      }
      
      await bucket.put(ctx.data.key, ctx.data.content, options)
      
      const duration = Date.now() - startTime
      
      return {
        success: true,
        key: ctx.data.key,
        size: ctx.data.content.length,
        contentType: ctx.data.contentType,
        duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      
      console.error('Failed to put R2 object:', error)
      return {
        success: false,
        error: String(error),
        duration
      }
    }
  })

// Put binary object to R2 (for images and other binary data)
const PutBinaryObjectSchema = z.object({
  bucket: z.enum(['ANALYTICS_STORAGE', 'IMAGE_STORAGE']),
  key: z.string().min(1),
  data: z.any(), // Accept any binary data type
  contentType: z.string().optional().default('application/octet-stream'),
  metadata: z.record(z.string(), z.string()).optional()
})

type PutBinaryObjectInput = z.infer<typeof PutBinaryObjectSchema>

export const putR2BinaryObject = baseFunction
  .inputValidator((data: PutBinaryObjectInput) => PutBinaryObjectSchema.parse(data))
  .handler(async (ctx) => {
    const { env } = await import('cloudflare:workers')
    const startTime = Date.now()
    
    try {
      const bucket = env[ctx.data.bucket]
      
      const options: any = {
        httpMetadata: {
          contentType: ctx.data.contentType
        }
      }
      
      if (ctx.data.metadata) {
        options.customMetadata = ctx.data.metadata
      }
      
      await bucket.put(ctx.data.key, ctx.data.data, options)
      
      const duration = Date.now() - startTime
      
      return {
        success: true,
        key: ctx.data.key,
        size: ctx.data.data.byteLength,
        contentType: ctx.data.contentType,
        duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      
      console.error('Failed to put R2 binary object:', error)
      return {
        success: false,
        error: String(error),
        duration
      }
    }
  })

// Delete object from R2
const DeleteObjectSchema = z.object({
  bucket: z.enum(['ANALYTICS_STORAGE', 'IMAGE_STORAGE']),
  key: z.string().min(1)
})

type DeleteObjectInput = z.infer<typeof DeleteObjectSchema>

export const deleteR2Object = baseFunction
  .inputValidator((data: DeleteObjectInput) => DeleteObjectSchema.parse(data))
  .handler(async (ctx) => {
    const { env } = await import('cloudflare:workers')
    const startTime = Date.now()
    
    try {
      const bucket = env[ctx.data.bucket]
      await bucket.delete(ctx.data.key)
      
      const duration = Date.now() - startTime
      
      return {
        success: true,
        key: ctx.data.key,
        duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      
      console.error('Failed to delete R2 object:', error)
      return {
        success: false,
        error: String(error),
        duration
      }
    }
  })
