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
  headers: Record<string, string>,
  body: unknown,
  isFromAgent?: boolean,
): void {
  if (!diagnosticEnabled) return;

  ensureDir(DIAGNOSTIC_DIR);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${isFromAgent ? '_' : ''}${provider}-${timestamp}.json`;
  const filepath = path.join(DIAGNOSTIC_DIR, filename);
  const data = {headers, body};
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}
