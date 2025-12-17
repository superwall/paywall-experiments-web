import { nanoid } from 'nanoid';
import type { ResultData } from '../types/result';

export function generateSlug(title?: string): string {
  if (!title) {
    return nanoid(10);
  }

  // Extract title from markdown if it starts with #
  const cleanTitle = title.trim().replace(/^#\s*/, '').split('\n')[0] || '';

  // Convert to snake_case
  const snakeCase = cleanTitle
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Remove duplicate hyphens
    .substring(0, 50);         // Limit length

  // Add entropy (6 chars for uniqueness)
  const entropy = nanoid(6);

  return `${snakeCase}-${entropy}`;
}

export async function saveResultToR2(
  storage: R2Bucket,
  slug: string,
  resultData: ResultData
): Promise<void> {
  const key = `results/${slug}.json`;
  const jsonData = JSON.stringify(resultData);

  await storage.put(key, jsonData, {
    httpMetadata: {
      contentType: 'application/json',
    },
  });
}

export async function getResultFromR2(
  storage: R2Bucket,
  slug: string
): Promise<ResultData | null> {
  console.log("[Storage] getResultFromR2 called with slug:", slug);
  const key = `results/${slug}.json`;
  console.log("[Storage] Looking up R2 key:", key);
  
  try {
    const object = await storage.get(key);
    console.log("[Storage] R2 get() completed, object found:", !!object);

    if (!object) {
      console.log("[Storage] No object found in R2 for key:", key);
      return null;
    }

    console.log("[Storage] Object found, reading text...");
    const data = await object.text();
    console.log("[Storage] Text read, length:", data.length);
    
    const parsed = JSON.parse(data) as ResultData;
    console.log("[Storage] JSON parsed successfully, result ID:", parsed.id);
    return parsed;
  } catch (error) {
    console.error("[Storage] Error in getResultFromR2:", error);
    console.error("[Storage] Error stack:", error instanceof Error ? error.stack : "No stack trace");
    throw error;
  }
}

export async function saveImageToR2(
  storage: R2Bucket,
  slug: string,
  imageIndex: number,
  imageData: ArrayBuffer,
  contentType: string,
  originalName?: string
): Promise<string> {
  const extension = contentType.split('/')[1] || 'jpg';
  const key = `images/${slug}/${imageIndex}.${extension}`;

  await storage.put(key, imageData, {
    httpMetadata: {
      contentType,
    },
    customMetadata: originalName ? {
      originalName,
    } : undefined,
  });

  return key;
}

export async function saveNamedImageToR2(
  storage: R2Bucket,
  slug: string,
  filename: string,
  imageData: ArrayBuffer,
  contentType: string
): Promise<string> {
  const safeFilename = filename.replace(/^\/+/, '').replace(/\.\.+/g, '.');
  const key = `images/${slug}/${safeFilename}`;

  await storage.put(key, imageData, {
    httpMetadata: {
      contentType,
    },
  });

  return key;
}
