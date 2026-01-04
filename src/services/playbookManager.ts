import fs from 'node:fs';
import {
  buildPlaybookInjectionPrompt,
  buildReflectionPrompt,
} from '../prompts/playbookPromptBuilder';
import { ModelConfig, Provider } from '../types/config';
import { Playbook, ReflectionResult } from '../types/playbook';
import { Session } from '../types/session';
import { distillMessages, getLastResponse } from '../utils/messageUtils';
import { ensureProjectDir, getProjectFilePath } from '../utils/omxPaths';
import { runConversation } from './chatOrchestrator';
import { addUserMessage, createSession } from './sessionManager';

function generateKeyPointName(existingNames: Set<string>): string {
  let maxNum = 0;
  for (const name of existingNames) {
    if (name.startsWith('kpt_')) {
      const num = parseInt(name.split('_')[1], 10);
      if (!isNaN(num)) {
        maxNum = Math.max(maxNum, num);
      }
    }
  }
  return `kpt_${String(maxNum + 1).padStart(3, '0')}`;
}

function isValidPlaybook(data: unknown): data is Playbook {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.keyPoints)) return false;
  return obj.keyPoints.every(kp =>
    typeof kp === 'object'
    && kp !== null
    && typeof kp.name === 'string'
    && typeof kp.text === 'string'
    && typeof kp.score === 'number'
  );
}

function loadPlaybook(): Playbook {
  const playbookPath = getProjectFilePath('playbook.json');

  let result: Playbook = {version: '1.0', keyPoints: []};

  if (!fs.existsSync(playbookPath)) {
    return result;
  }

  try {
    const data = JSON.parse(fs.readFileSync(playbookPath, 'utf-8'));
    if (isValidPlaybook(data)) {
      result = data;
    }
  } catch {}
  return result;
}

function savePlaybook(playbook: Playbook): void {
  ensureProjectDir();
  fs.writeFileSync(getProjectFilePath('playbook.json'), JSON.stringify(playbook, null, 2));
}

function updatePlaybook(playbook: Playbook, reflectionResult: ReflectionResult): Playbook {
  const newKeyPoints = reflectionResult.newKeyPoints || [];
  const evaluations = reflectionResult.evaluations || [];

  const existingNames = new Set(playbook.keyPoints.map(kp => kp.name));
  const existingTexts = new Set(playbook.keyPoints.map(kp => kp.text));

  for (const text of newKeyPoints) {
    if (text && !existingTexts.has(text)) {
      const name = generateKeyPointName(existingNames);
      playbook.keyPoints.push({name, text, score: 0});
      existingNames.add(name);
    }
  }

  const ratingDelta: Record<string, number> = {helpful: 1, harmful: -3, neutral: -1};
  const nameToKp = new Map(playbook.keyPoints.map(kp => [kp.name, kp]));

  for (const evalItem of evaluations) {
    const kp = nameToKp.get(evalItem.name);
    if (kp) {
      kp.score += ratingDelta[evalItem.rating] ?? 0;
    }
  }

  playbook.keyPoints = playbook.keyPoints.filter(kp => kp.score > -5);

  return playbook;
}

function extractReflectionFromResponse(response: string): ReflectionResult {
  let jsonText = response;

  if (response.includes('```json')) {
    const start = response.indexOf('```json') + 7;
    const end = response.indexOf('```', start);
    jsonText = response.slice(start, end).trim();
  } else if (response.includes('```')) {
    const start = response.indexOf('```') + 3;
    const end = response.indexOf('```', start);
    jsonText = response.slice(start, end).trim();
  }

  try {
    const result = JSON.parse(jsonText);
    return {newKeyPoints: result.newKeyPoints || [], evaluations: result.evaluations || []};
  } catch {
    return {newKeyPoints: [], evaluations: []};
  }
}

export async function generatePlaybook(
  model: ModelConfig,
  session: Session,
  signal?: AbortSignal,
): Promise<Playbook> {
  const playbook = loadPlaybook();
  const trajectories = distillMessages(session.messages);
  const promptText = buildReflectionPrompt(trajectories, playbook);

  const reflectionSession = createSession(model);
  const sessionWithPrompt = addUserMessage(reflectionSession, promptText, model.provider);

  const resultSession = await runConversation(
    sessionWithPrompt,
    undefined,
    signal,
    {excludeAgents: true, excludeMcp: true, allowedTools: [], additionalTools: null},
    model,
    true,
    true,
  );

  const responseContent = getLastResponse(resultSession);
  const reflectionResult = extractReflectionFromResponse(responseContent);
  const updatedPlaybook = updatePlaybook(playbook, reflectionResult);
  savePlaybook(updatedPlaybook);

  return updatedPlaybook;
}

export function injectPlaybook(session: Session, provider: Provider, playbook?: Playbook): Session {
  const finalPlaybook = playbook ?? loadPlaybook();
  if (finalPlaybook.keyPoints.length === 0) {
    return session;
  }

  const playbookMessage = buildPlaybookInjectionPrompt(finalPlaybook);
  if (!playbookMessage) {
    return session;
  }

  return addUserMessage(session, playbookMessage, provider);
}
