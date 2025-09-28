import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { env } from "cloudflare:workers";

// Track server function executions
export const trackServerExecution = createServerFn().handler(async () => {
  const today = new Date().toISOString().split("T")[0];
  const cacheKey = `server_executions:${today}`;

  try {
    // Simple counter in KV
    const currentCount = await env.ANALYTICS_CACHE.get(cacheKey);
    const newCount = currentCount ? parseInt(currentCount) + 1 : 1;
    await env.ANALYTICS_CACHE.put(cacheKey, newCount.toString(), {
      expirationTtl: 86400,
    });

    console.log(`Server function executed. Daily count: ${newCount}`);
    return { success: true, count: newCount };
  } catch (error) {
    console.error("Failed to track server execution:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Get server execution count
export const getExecutionCount = createServerFn().handler(async () => {
  const today = new Date().toISOString().split("T")[0];
  const cacheKey = `server_executions:${today}`;

  try {
    const count = await env.ANALYTICS_CACHE.get(cacheKey);
    return { success: true, count: count ? parseInt(count) : 0, date: today };
  } catch (error) {
    console.error("Failed to get execution count:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Export analytics data to R2
export const exportAnalyticsToR2 = createServerFn()
  .inputValidator((data: { date?: string } | undefined) =>
    z.object({ date: z.string().optional() }).parse(data || {}),
  )
  .handler(async (ctx) => {
    const { date } = ctx.data;
    const exportDate = date || new Date().toISOString().split("T")[0];
    const cacheKey = `server_executions:${exportDate}`;

    try {
      // Get the execution count for the specified date
      const count = await env.ANALYTICS_CACHE.get(cacheKey);
      const executionCount = count ? parseInt(count) : 0;

      // Create export data
      const exportData = {
        exportInfo: {
          date: exportDate,
          exportTimestamp: Date.now(),
          exportType: "server_executions",
        },
        data: {
          serverExecutions: executionCount,
          date: exportDate,
        },
        metadata: {
          description:
            "Daily server function execution count from interactive demo",
          source: "Cloudflare KV Storage",
          format: "JSON",
        },
      };

      // Generate filename with readable timestamp
      const now = new Date();
      const timeString = now.toISOString().replace(/[:.]/g, "-").slice(0, -5); // Remove milliseconds and colons
      const filename = `analytics-${exportDate}-${timeString}.json`;
      const fileContent = JSON.stringify(exportData, null, 2);

      // Store in R2
      await env.ANALYTICS_STORAGE.put(filename, fileContent, {
        httpMetadata: {
          contentType: "application/json",
        },
        customMetadata: {
          exportDate,
          executionCount: String(executionCount),
          exportType: "server_executions",
        },
      });

      return {
        success: true,
        filename,
        size: fileContent.length,
        executionCount,
        date: exportDate,
      };
    } catch (error) {
      console.error("Failed to export analytics to R2:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

// List R2 exports
export const listR2Exports = createServerFn().handler(async () => {
  try {
    const list = await env.ANALYTICS_STORAGE.list();

    const exports =
      list?.objects?.map((obj: any) => ({
        filename: obj.key,
        size: obj.size,
        uploaded: obj.uploaded,
        metadata: obj.customMetadata || {},
      })) || [];

    return { success: true, exports };
  } catch (error) {
    console.error("Failed to list R2 exports:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Download R2 export
export const downloadR2Export = createServerFn()
  .inputValidator((data: { filename: string } | undefined) =>
    z.object({ filename: z.string().min(1) }).parse(data || {}),
  )
  .handler(async (ctx) => {
    const { filename } = ctx.data;

    try {
      const object = await env.ANALYTICS_STORAGE.get(filename);

      if (!object) {
        return { success: false, error: "File not found" };
      }

      const content = await object.text();

      return {
        success: true,
        filename,
        content,
        contentType: object.httpMetadata?.contentType || "application/json",
        size: object.size,
        metadata: object.customMetadata || {},
      };
    } catch (error) {
      console.error("Failed to download from R2:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });
