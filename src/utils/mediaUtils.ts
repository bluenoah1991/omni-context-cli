import fs from 'node:fs';
import path from 'node:path';

const MEDIA_EXTENSIONS: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export function getMediaMimeType(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  return MEDIA_EXTENSIONS[ext] || null;
}

export function isMediaPath(filePath: string): boolean {
  return getMediaMimeType(filePath) !== null;
}

export function loadMediaAsBase64(filePath: string): {dataUrl: string; mimeType: string;} | null {
  const mimeType = getMediaMimeType(filePath);
  if (!mimeType) return null;

  try {
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    return {dataUrl: `data:${mimeType};base64,${base64}`, mimeType};
  } catch {
    return null;
  }
}

export function parseDataUrl(dataUrl: string): {mediaType: string; data: string;} | null {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (matches) {
    return {mediaType: matches[1], data: matches[2]};
  }
  return null;
}

export function extractMediaPath(text: string): string | null {
  const trimmed = text.trim();
  const unquoted = trimmed.replace(/^["']|["']$/g, '');
  if (isMediaPath(unquoted) && fs.existsSync(unquoted)) {
    return unquoted;
  }
  return null;
}
