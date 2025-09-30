import { createServerFn } from "@tanstack/react-start";
import { file, z } from "zod";
import { env } from "cloudflare:workers";

export const trackServerExecution = createServerFn({ method: 'POST' }).handler(async () => {
  const today = new Date().toISOString().split("T")[0];
  const cacheKey = `server_executions:${today}`;

  try {
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

export const getExecutionCount = createServerFn({ method: 'POST' }).handler(async () => {
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

export const exportAnalyticsToR2 = createServerFn({
  method: "POST",
})
  .inputValidator((date: string) => date)
  .handler(async ({ data: date }) => {
    const exportDate = date || new Date().toISOString().split("T")[0];
    const cacheKey = `server_executions:${exportDate}`;

    try {
      const count = await env.ANALYTICS_CACHE.get(cacheKey);
      const executionCount = count ? parseInt(count) : 0;

      const exportData = {
        date: exportDate,
        executions: executionCount,
        exported: Date.now(),
      };

      const now = new Date();
      const timeString = now.toISOString().replace(/[:.]/g, "-").slice(0, -5);
      const filename = `analytics-${exportDate}-${timeString}.json`;
      const fileContent = JSON.stringify(exportData, null, 2);
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

export const listR2Exports = createServerFn({ method: 'POST' }).handler(async () => {
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

export const downloadR2Export = createServerFn({
  method: "POST",
})
  .inputValidator((filename: string) => filename)
  .handler(async ({ data: filename }) => {
    console.log(`Downloading file: ${filename}`);

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
