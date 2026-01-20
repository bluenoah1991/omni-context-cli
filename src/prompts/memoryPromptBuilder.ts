import { Memory } from '../types/memory';
import memoryTemplate from './memory.txt';
import reflectionTemplate from './reflection.txt';

export function buildReflectionPrompt(trajectories: string, memory: Memory): string {
  const memoryDict: Record<string, string> = {};
  for (const kp of memory.keyPoints) {
    memoryDict[kp.name] = kp.text;
  }

  return reflectionTemplate.replace('{{TRAJECTORIES}}', trajectories).replace(
    '{{MEMORY}}',
    JSON.stringify(memoryDict, null, 2),
  );
}

export function buildMemoryInjectionPrompt(memory: Memory): string {
  if (memory.keyPoints.length === 0) {
    return '';
  }

  const keyPointsText = memory.keyPoints.map(kp => `- ${kp.text}`).join('\n');
  const memoryContent = memoryTemplate.replace('{{KEY_POINTS}}', keyPointsText);
  const uiPlaceholder = `[Injected ${memory.keyPoints.length} key point${
    memory.keyPoints.length > 1 ? 's' : ''
  } from memory]`;
  return `<dual_message>\n<ui>${uiPlaceholder}</ui>\n<prompt>\n${memoryContent}\n</prompt>\n</dual_message>`;
}
