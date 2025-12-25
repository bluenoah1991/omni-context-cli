import os from 'node:os';
import specialistPrompt from './specialist.txt';
import systemPrompt from './system.txt';

export function buildSystemPrompt(specialistMode?: boolean): string {
  let result = specialistMode ? specialistPrompt : systemPrompt;
  result = result.replace('{{OS_TYPE}}', getOSType());
  result = result.replace('{{PLATFORM}}', os.platform());
  result = result.replace('{{ARCH}}', os.arch());
  return result;
}

function getOSType(): string {
  const platform = os.platform();
  if (platform === 'win32') return 'Windows';
  if (platform === 'darwin') return 'macOS';
  return 'Unix-like';
}
