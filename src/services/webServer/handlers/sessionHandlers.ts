import http from 'node:http';
import { sessionMessagesToUI } from '../../messageConverter';
import { createSession, listSessions, loadSessionById } from '../../sessionManager';
import { WebSession } from '../../webSessionManager';
import { parseRequestBody, sendErrorResponse, sendJsonResponse } from '../httpUtils';

export function handleGetSession(res: http.ServerResponse, webSession: WebSession): boolean {
  if (!webSession.chatSession) {
    webSession.chatSession = createSession();
  }
  const session = webSession.chatSession;
  sendJsonResponse(res, {
    id: session.id,
    title: session.title,
    provider: session.provider,
    messages: sessionMessagesToUI(session.messages, session.provider),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    inputTokens: session.inputTokens ?? 0,
    outputTokens: session.outputTokens ?? 0,
    cachedTokens: session.cachedTokens ?? 0,
  });
  return true;
}

export function handleGetSessions(res: http.ServerResponse, webSession: WebSession): boolean {
  if (!webSession.currentModel) {
    sendJsonResponse(res, []);
    return true;
  }

  const sessions = listSessions(webSession.currentModel.provider);
  sendJsonResponse(
    res,
    sessions.map(session => ({
      id: session.id,
      title: session.title,
      provider: session.provider,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    })),
  );
  return true;
}

export async function handleLoadSession(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  webSession: WebSession,
): Promise<boolean> {
  const body = await parseRequestBody(req).catch(() => null);
  if (body === null) {
    sendErrorResponse(res, 'Invalid request body', 400);
    return true;
  }

  const sessionId = body.id as string;
  if (!sessionId) {
    sendErrorResponse(res, 'Missing session id', 400);
    return true;
  }

  const session = loadSessionById(sessionId);
  if (!session) {
    sendErrorResponse(res, 'Session not found', 404);
    return true;
  }

  webSession.chatSession = session;
  sendJsonResponse(res, {
    id: session.id,
    title: session.title,
    provider: session.provider,
    messages: sessionMessagesToUI(session.messages, session.provider),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    inputTokens: session.inputTokens ?? 0,
    outputTokens: session.outputTokens ?? 0,
    cachedTokens: session.cachedTokens ?? 0,
  });
  return true;
}

export function handleNewSession(res: http.ServerResponse, webSession: WebSession): boolean {
  const session = createSession();
  webSession.chatSession = session;
  sendJsonResponse(res, {
    id: session.id,
    title: session.title,
    provider: session.provider,
    messages: [],
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
  });
  return true;
}
