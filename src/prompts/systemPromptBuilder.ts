import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import specialistPrompt from './specialist.txt';
import systemPrompt from './system.txt';

const USER_SPECIALIST_PATH = path.join(os.homedir(), '.omx', 'specialist.txt');

export function buildSystemPrompt(specialistMode?: boolean): string {
  let result = specialistMode ? getSpecialistPrompt() : systemPrompt;
  result = result.replace('{{OS_TYPE}}', getOSType());
  result = result.replace('{{PLATFORM}}', os.platform());
  result = result.replace('{{ARCH}}', os.arch());
  return result;
}

function getSpecialistPrompt(): string {
  try {
    if (fs.existsSync(USER_SPECIALIST_PATH)) {
      return fs.readFileSync(USER_SPECIALIST_PATH, 'utf-8');
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
