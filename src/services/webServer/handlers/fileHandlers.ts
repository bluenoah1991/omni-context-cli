import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { sendErrorResponse, sendJsonResponse } from '../httpUtils';

interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  path: string;
}

const MAX_ENTRIES = 500;

const IMAGE_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

const IMAGE_EXTENSIONS = new Set(Object.keys(IMAGE_MIME_TYPES));

const BINARY_EXTENSIONS = new Set([
  ...IMAGE_EXTENSIONS,
  '.pdf',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.zip',
  '.gz',
  '.tar',
  '.rar',
  '.7z',
  '.mp3',
  '.mp4',
  '.wav',
  '.avi',
  '.mov',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
]);

export async function handleListFiles(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<boolean> {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const requestedPath = url.searchParams.get('path') || '.';
  const cwd = process.cwd();
  const resolved = path.resolve(cwd, requestedPath);

  if (!resolved.startsWith(cwd)) {
    sendErrorResponse(res, 'Path outside project root', 403);
    return true;
  }

  try {
    const dirents = await fs.readdir(resolved, {withFileTypes: true});
    const entries: FileEntry[] = [];

    for (const dirent of dirents) {
      if (entries.length >= MAX_ENTRIES) break;

      const fullPath = path.join(resolved, dirent.name);
      const isDir = dirent.isDirectory();
      const relativePath = path.relative(cwd, fullPath).replace(/\\/g, '/');

      entries.push({name: dirent.name, type: isDir ? 'directory' : 'file', path: relativePath});
    }

    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    sendJsonResponse(res, {entries, truncated: dirents.length > MAX_ENTRIES});
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      sendErrorResponse(res, 'Directory not found', 404);
    } else if (err.code === 'ENOTDIR') {
      sendErrorResponse(res, 'Not a directory', 400);
    } else {
      sendErrorResponse(res, 'Failed to list directory', 500);
    }
  }

  return true;
}

export async function handleReadFile(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<boolean> {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const requestedPath = url.searchParams.get('path') || '';
  const cwd = process.cwd();
  const resolved = path.resolve(cwd, requestedPath);

  if (!resolved.startsWith(cwd)) {
    sendErrorResponse(res, 'Path outside project root', 403);
    return true;
  }

  try {
    const stat = await fs.stat(resolved);

    if (stat.isDirectory()) {
      sendErrorResponse(res, 'Path is a directory', 400);
      return true;
    }

    const MAX_SIZE = 1024 * 1024;
    if (stat.size > MAX_SIZE) {
      sendJsonResponse(res, {
        content: null,
        truncated: true,
        size: stat.size,
        error: 'File too large to preview',
      });
      return true;
    }

    const ext = path.extname(resolved).toLowerCase();

    if (BINARY_EXTENSIONS.has(ext)) {
      if (IMAGE_EXTENSIONS.has(ext)) {
        const base64 = (await fs.readFile(resolved)).toString('base64');
        sendJsonResponse(res, {
          type: 'image',
          mimeType: IMAGE_MIME_TYPES[ext] || 'application/octet-stream',
          base64,
        });
        return true;
      }

      sendJsonResponse(res, {type: 'binary', size: stat.size});
      return true;
    }

    const content = await fs.readFile(resolved, 'utf-8');
    sendJsonResponse(res, {type: 'text', content, size: stat.size});
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      sendErrorResponse(res, 'File not found', 404);
    } else {
      sendErrorResponse(res, 'Failed to read file', 500);
    }
  }

  return true;
}
