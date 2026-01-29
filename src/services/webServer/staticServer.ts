import fs from 'node:fs';
import type http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sendRawResponse } from './httpUtils.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const WEB_CLIENT_DIR = path.join(scriptDir, 'clients', 'web');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

export function serveStatic(res: http.ServerResponse, pathname: string): boolean {
  let filePath = path.join(WEB_CLIENT_DIR, pathname === '/' ? 'index.html' : pathname);

  if (!fs.existsSync(filePath)) {
    return false;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    sendRawResponse(res, content, contentType);
  } catch {
    return false;
  }

  return true;
}
