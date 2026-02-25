import fs from 'node:fs';
import os from 'node:os';
import { loadAppConfig } from '../services/configManager';
import { getSkills } from '../services/skillManager';
import { WorkflowPreset } from '../types/config';
import { getOmxFilePath } from '../utils/omxPaths';
import { checkWSL } from '../utils/wsl';
import artistPrompt from './artist.txt';
import assistantPrompt from './assistant.txt';
import explorerPrompt from './explorer.txt';
import { buildSkillsPrompt } from './skillsPromptBuilder';
import specialistPrompt from './specialist.txt';
import systemPrompt from './system.txt';
import wslPrompt from './wsl.txt';

export async function buildSystemPrompt(
  workflowPreset?: WorkflowPreset,
  isFromAgent?: boolean,
): Promise<string> {
  const effectiveMode = isFromAgent ? 'normal' : (workflowPreset ?? 'normal');
  let result = getPresetPrompt(effectiveMode);
  result = result.replace('{{OS_TYPE}}', getOSType());
  result = result.replace('{{PLATFORM}}', os.platform());
  result = result.replace('{{ARCH}}', os.arch());
  result = result.replace('{{CWD}}', process.cwd());
  result = result.replace('{{TODAY}}', new Date().toISOString().split('T')[0]);

  if (effectiveMode === 'normal' && await checkWSL()) {
    result += '\n\n' + wslPrompt;
  }

  if (effectiveMode === 'normal' && !isFromAgent) {
    const skillsPrompt = buildSkillsPrompt(getSkills());
    if (skillsPrompt) {
      result += '\n\n' + skillsPrompt;
    }
  }

  const responseLanguage = loadAppConfig().responseLanguage;
  if (responseLanguage && responseLanguage !== 'auto') {
    const langName = responseLanguage === 'zh' ? 'Chinese (Simplified)' : 'English';
    result += '\n\nIMPORTANT: Always respond in ' + langName
      + ', regardless of the language the user writes in.';
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
  if (preset === 'explorer') {
    return getUserPromptOrDefault('explorer.txt', explorerPrompt);
  }
  if (preset === 'assistant') {
    return getUserPromptOrDefault('assistant.txt', assistantPrompt);
  }
  return systemPrompt;
}

function getUserPromptOrDefault(filename: string, defaultPrompt: string): string {
  try {
    const userPath = getOmxFilePath(filename);
    return fs.readFileSync(userPath, 'utf-8');
  } catch {
    return defaultPrompt;
  }
}

function getOSType(): string {
  const platform = os.platform();
  if (platform === 'win32') return 'Windows';
  if (platform === 'darwin') return 'macOS';
  return 'Unix-like';
}
