import { Playbook } from '../types/playbook';
import playbookTemplate from './playbook.txt';
import reflectionTemplate from './reflection.txt';

export function buildReflectionPrompt(trajectories: string, playbook: Playbook): string {
  const playbookDict: Record<string, string> = {};
  for (const kp of playbook.keyPoints) {
    playbookDict[kp.name] = kp.text;
  }

  return reflectionTemplate.replace('{{TRAJECTORIES}}', trajectories).replace(
    '{{PLAYBOOK}}',
    JSON.stringify(playbookDict, null, 2),
  );
}

export function buildPlaybookInjectionPrompt(playbook: Playbook): string {
  if (playbook.keyPoints.length === 0) {
    return '';
  }

  const keyPointsText = playbook.keyPoints.map(kp => `- ${kp.text}`).join('\n');
  const playbookContent = playbookTemplate.replace('{{KEY_POINTS}}', keyPointsText);
  const uiPlaceholder = `[Injected ${playbook.keyPoints.length} key point${
    playbook.keyPoints.length > 1 ? 's' : ''
  } from playbook]`;
  return `<dual_message>\n<ui>${uiPlaceholder}</ui>\n<prompt>\n${playbookContent}\n</prompt>\n</dual_message>`;
}
