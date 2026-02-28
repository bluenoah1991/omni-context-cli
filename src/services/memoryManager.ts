import fs from 'node:fs';
import { buildMemoryInjectionPrompt, buildReflectionPrompt } from '../prompts/memoryPromptBuilder';
import { ModelConfig, Provider } from '../types/config';
import { Memory, ReflectionResult } from '../types/memory';
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

function isValidMemory(data: unknown): data is Memory {
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

export function loadMemory(): Memory {
  const memoryPath = getProjectFilePath('memory.json');

  let result: Memory = {version: '1.0', keyPoints: []};

  if (!fs.existsSync(memoryPath)) {
    return result;
  }

  try {
    const data = JSON.parse(fs.readFileSync(memoryPath, 'utf-8'));
    if (isValidMemory(data)) {
      result = data;
    }
  } catch {}
  return result;
}

export function saveMemory(memory: Memory): void {
  ensureProjectDir();
  fs.writeFileSync(getProjectFilePath('memory.json'), JSON.stringify(memory, null, 2));
}

function updateMemory(memory: Memory, reflectionResult: ReflectionResult): Memory {
  const newKeyPoints = reflectionResult.newKeyPoints || [];
  const evaluations = reflectionResult.evaluations || [];

  const existingNames = new Set(memory.keyPoints.map(kp => kp.name));
  const existingTexts = new Set(memory.keyPoints.map(kp => kp.text));

  for (const text of newKeyPoints) {
    if (text && !existingTexts.has(text)) {
      const name = generateKeyPointName(existingNames);
      memory.keyPoints.push({name, text, score: 0});
      existingNames.add(name);
    }
  }

  const ratingDelta: Record<string, number> = {helpful: 3, neutral: -1, harmful: -6};
  const evalMap = new Map(evaluations.map(e => [e.name, e.rating]));

  for (const kp of memory.keyPoints) {
    const rating = evalMap.get(kp.name);
    if (rating) {
      kp.score += ratingDelta[rating] ?? 0;
    }
  }

  memory.keyPoints = memory.keyPoints.filter(kp => kp.score > -10);

  return memory;
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

export async function generateMemory(
  model: ModelConfig,
  session: Session,
  signal?: AbortSignal,
): Promise<Memory> {
  const memory = loadMemory();
  const trajectories = distillMessages(session.messages);
  const promptText = buildReflectionPrompt(trajectories, memory);

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
    true,
  );

  const responseContent = getLastResponse(resultSession);
  const reflectionResult = extractReflectionFromResponse(responseContent);
  const updatedMemory = updateMemory(memory, reflectionResult);
  saveMemory(updatedMemory);

  return updatedMemory;
}

export function injectMemory(session: Session, provider: Provider, memory?: Memory): Session {
  const finalMemory = memory ?? loadMemory();
  if (finalMemory.keyPoints.length === 0) {
    return session;
  }

  const memoryMessage = buildMemoryInjectionPrompt(finalMemory);
  if (!memoryMessage) {
    return session;
  }

  return addUserMessage(session, memoryMessage, provider);
}
