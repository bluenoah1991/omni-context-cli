import fs from 'node:fs';
import os from 'node:os';
import { getOmxFilePath } from '../utils/omxPaths';
import specialistPrompt from './specialist.txt';
import systemPrompt from './system.txt';

export function buildSystemPrompt(specialistMode?: boolean): string {
  let result = specialistMode ? getSpecialistPrompt() : systemPrompt;
  result = result.replace('{{OS_TYPE}}', getOSType());
  result = result.replace('{{PLATFORM}}', os.platform());
  result = result.replace('{{ARCH}}', os.arch());
  return result;
}

function getSpecialistPrompt(): string {
  try {
    const userPath = getOmxFilePath('specialist.txt');
    if (fs.existsSync(userPath)) {
      return fs.readFileSync(userPath, 'utf-8');
    }
  } catch {}
  return specialistPrompt;
}

function getOSType(): string {
  const platform = os.platform();
  if (platform === 'win32') return 'Windows';
  if (platform === 'darwin') return 'macOS';
  return 'Unix-like';
}
