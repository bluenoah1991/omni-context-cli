import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import { ensureDir, getOmxDir, getOmxFilePath } from '../../utils/omxPaths.js';
import { parseRequestBody, sendErrorResponse, sendJsonResponse } from './httpUtils.js';

const PASSWORD_FILE = 'password';
const TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const BASE_LOCKOUT_MS = 30_000;

const validTokens = new Map<string, number>();
const failedAttempts = new Map<string, {count: number; lastAttempt: number;}>();

function getPasswordFilePath(): string {
  return getOmxFilePath(PASSWORD_FILE);
}

export function isAuthEnabled(): boolean {
  return fs.existsSync(getPasswordFilePath());
}

function readPasswordHash(): {salt: string; hash: string;} | null {
  try {
    const content = fs.readFileSync(getPasswordFilePath(), 'utf-8').trim();
    const [salt, hash] = content.split(':');
    if (salt && hash) return {salt, hash};
  } catch {}
  return null;
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function setPassword(password: string): void {
  ensureDir(getOmxDir());
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = hashPassword(password, salt);
  fs.writeFileSync(getPasswordFilePath(), `${salt}:${hash}`, {encoding: 'utf-8', mode: 0o600});
}

export function clearPassword(): void {
  const path = getPasswordFilePath();
  try {
    fs.unlinkSync(path);
  } catch {}
}

function verifyPassword(password: string): boolean {
  const stored = readPasswordHash();
  if (!stored) return false;
  const hash = hashPassword(password, stored.salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(stored.hash));
}

function getClientIP(req: http.IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(ip: string): number {
  const record = failedAttempts.get(ip);
  if (!record || record.count < MAX_ATTEMPTS) return 0;
  const multiplier = Math.floor((record.count - MAX_ATTEMPTS) / MAX_ATTEMPTS);
  const lockoutMs = BASE_LOCKOUT_MS * Math.pow(2, Math.min(multiplier, 6));
  const elapsed = Date.now() - record.lastAttempt;
  return Math.max(0, lockoutMs - elapsed);
}

function recordFailure(ip: string): void {
  const record = failedAttempts.get(ip) || {count: 0, lastAttempt: 0};
  record.count++;
  record.lastAttempt = Date.now();
  failedAttempts.set(ip, record);
}

function clearFailures(ip: string): void {
  failedAttempts.delete(ip);
}

function isValidToken(token: string | undefined): boolean {
  if (!token) return false;
  const expiry = validTokens.get(token);
  if (expiry == null) return false;
  if (Date.now() > expiry) {
    validTokens.delete(token);
    return false;
  }
  return true;
}

function createToken(): string {
  const token = crypto.randomUUID();
  validTokens.set(token, Date.now() + TOKEN_MAX_AGE_MS);
  return token;
}

function checkAuth(req: http.IncomingMessage): boolean {
  if (!isAuthEnabled()) return true;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return isValidToken(authHeader.slice(7));
  }
  return false;
}

async function handleLoginAPI(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const ip = getClientIP(req);
  const remaining = checkRateLimit(ip);
  if (remaining > 0) {
    const seconds = Math.ceil(remaining / 1000);
    sendJsonResponse(res, {
      error: `Too many attempts. Try again in ${seconds}s.`,
      retryAfter: seconds,
    }, 429);
    return;
  }

  try {
    const {password} = await parseRequestBody(req);
    if (!verifyPassword(password)) {
      recordFailure(ip);
      sendErrorResponse(res, 'Wrong password', 401);
      return;
    }
    clearFailures(ip);
    const token = createToken();
    sendJsonResponse(res, {ok: true, token});
  } catch {
    sendErrorResponse(res, 'Invalid request');
  }
}

export async function handleAuth(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
  method: string,
): Promise<boolean> {
  if (method === 'OPTIONS') return false;
  if (pathname === '/api/health' && method === 'GET') return false;
  if (pathname.startsWith('/api/remote/')) return false;

  if (pathname === '/api/auth/login' && method === 'POST') {
    await handleLoginAPI(req, res);
    return true;
  }

  if (pathname === '/api/auth/check' && method === 'GET') {
    if (!checkAuth(req)) {
      sendErrorResponse(res, 'Unauthorized', 401);
    } else {
      sendJsonResponse(res, {ok: true});
    }
    return true;
  }

  if (pathname.startsWith('/api/') && !checkAuth(req)) {
    sendErrorResponse(res, 'Unauthorized', 401);
    return true;
  }

  return false;
}
