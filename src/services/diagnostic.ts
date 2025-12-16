import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DIAGNOSTIC_DIR = path.join(os.homedir(), '.omx', 'diagnostic');

let diagnosticEnabled = false;

export function enableDiagnostic(): void {
  diagnosticEnabled = true;
}

export function isDiagnosticEnabled(): boolean {
  return diagnosticEnabled;
}

function ensureDiagnosticDir(): void {
  if (!fs.existsSync(DIAGNOSTIC_DIR)) {
    fs.mkdirSync(DIAGNOSTIC_DIR, {recursive: true});
  }
}

export function saveRequest(
  provider: string,
  headers: Record<string, string>,
  body: unknown,
): void {
  if (!diagnosticEnabled) return;

  ensureDiagnosticDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${provider}-${timestamp}.json`;
  const filepath = path.join(DIAGNOSTIC_DIR, filename);
  const data = {headers, body};
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}
