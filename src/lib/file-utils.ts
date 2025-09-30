export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const downloadFile = (url: string, filename: string): void => {
  // Create a temporary anchor element and trigger download
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  // Append to body, click, and remove to avoid memory leaks
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadImageAsBlob = async (url: string, filename: string): Promise<void> => {
  try {
    // Fetch the image as a blob to handle cross-origin scenarios
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up blob URL to prevent memory leaks
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Download failed:", error);
    // Fallback to simple download method
    downloadFile(url, filename);
  }
};

export const getFileExtensionFromUrl = (url: string): string => {
  const pathname = new URL(url).pathname;
  const extension = pathname.split('.').pop();
  return extension || 'jpg'; // default to jpg if no extension found
};

export const sanitizeFilename = (filename: string): string => {
  // Remove or replace invalid characters for filenames
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 255); // Limit filename length
};