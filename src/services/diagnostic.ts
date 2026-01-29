import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, getOmxDir } from '../utils/omxPaths';

const DIAGNOSTIC_DIR = path.join(getOmxDir(), 'diagnostic');

let diagnosticEnabled = false;

export function enableDiagnostic(): void {
  diagnosticEnabled = true;
}

export function isDiagnosticEnabled(): boolean {
  return diagnosticEnabled;
}

export function saveRequest(
  provider: string,
  body: unknown,
  isFromAgent?: boolean,
): string | undefined {
  if (!diagnosticEnabled) return;

  ensureDir(DIAGNOSTIC_DIR);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const requestId = `${isFromAgent ? '_' : ''}${provider}-${timestamp}`;
  const filepath = path.join(DIAGNOSTIC_DIR, `${requestId}-request.json`);
  fs.writeFileSync(filepath, JSON.stringify(body, null, 2), 'utf-8');
  return requestId;
}

export function saveResponse(requestId: string | undefined, body: unknown): void {
  if (!diagnosticEnabled || !requestId) return;

  const filepath = path.join(DIAGNOSTIC_DIR, `${requestId}.json`);
  fs.writeFileSync(filepath, JSON.stringify(body, null, 2), 'utf-8');
}
