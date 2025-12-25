import os from 'node:os';
import orchestratorPrompt from './orchestrator.txt';
import systemPrompt from './system.txt';

export function buildSystemPrompt(orchestratorMode?: boolean): string {
  let result = orchestratorMode ? orchestratorPrompt : systemPrompt;
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
