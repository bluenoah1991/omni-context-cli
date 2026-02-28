import http from 'node:http';
import type { KeyPoint } from '../../../types/memory';
import { loadMemory, saveMemory } from '../../memoryManager';
import { parseRequestBody, sendErrorResponse, sendJsonResponse } from '../httpUtils';

export function handleGetMemory(res: http.ServerResponse): boolean {
  const memory = loadMemory();
  sendJsonResponse(res, memory.keyPoints);
  return true;
}

export async function handleUpdateMemory(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<boolean> {
  const body = await parseRequestBody(req).catch(() => null);
  if (body === null) {
    sendErrorResponse(res, 'Invalid request body', 400);
    return true;
  }

  const keyPoints: KeyPoint[] = body.keyPoints;

  if (
    !Array.isArray(keyPoints) || !keyPoints.every(kp =>
      typeof kp.name === 'string' && typeof kp.text === 'string' && typeof kp.score === 'number'
    )
  ) {
    sendErrorResponse(res, 'Invalid key points', 400);
    return true;
  }

  const memory = loadMemory();
  memory.keyPoints = keyPoints.map(kp => ({name: kp.name, text: kp.text, score: kp.score}));
  saveMemory(memory);
  sendJsonResponse(res, {ok: true});
  return true;
}
