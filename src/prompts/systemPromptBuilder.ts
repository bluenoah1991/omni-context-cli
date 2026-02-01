import fs from 'node:fs';
import os from 'node:os';
import { getSkills } from '../services/skillManager';
import { WorkflowPreset } from '../types/config';
import { getOmxFilePath } from '../utils/omxPaths';
import artistPrompt from './artist.txt';
import { buildSkillsPrompt } from './skillsPromptBuilder';
import specialistPrompt from './specialist.txt';
import systemPrompt from './system.txt';

export function buildSystemPrompt(workflowPreset?: WorkflowPreset, isFromAgent?: boolean): string {
  const effectiveMode = isFromAgent ? 'normal' : (workflowPreset ?? 'normal');
  let result = getPresetPrompt(effectiveMode);
  result = result.replace('{{OS_TYPE}}', getOSType());
  result = result.replace('{{PLATFORM}}', os.platform());
  result = result.replace('{{ARCH}}', os.arch());
  result = result.replace('{{CWD}}', process.cwd());

  if (effectiveMode === 'normal' && !isFromAgent) {
    const skillsPrompt = buildSkillsPrompt(getSkills());
    if (skillsPrompt) {
      result += '\n\n' + skillsPrompt;
    }
  }

  return result;
}

function getPresetPrompt(preset: WorkflowPreset): string {
  if (preset === 'specialist') {
    return getUserPromptOrDefault('specialist.txt', specialistPrompt);
  }
  if (preset === 'artist') {
    return getUserPromptOrDefault('artist.txt', artistPrompt);
  }
  return systemPrompt;
}

function getUserPromptOrDefault(filename: string, defaultPrompt: string): string {
  try {
    const userPath = getOmxFilePath(filename);
    if (fs.existsSync(userPath)) {
      return fs.readFileSync(userPath, 'utf-8');
    }
  } catch {}
  return defaultPrompt;
}

function getOSType(): string {
  const platform = os.platform();
  if (platform === 'win32') return 'Windows';
  if (platform === 'darwin') return 'macOS';
  return 'Unix-like';
}
