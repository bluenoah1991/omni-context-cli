import http from 'node:http';
import { getWebSession } from '../webSessionManager';
import {
  handleChat,
  handleGetIDEContext,
  handleGetSlashCommands,
  handleStopGeneration,
} from './handlers/chatHandlers';
import {
  handleGetConfig,
  handleGetModel,
  handleGetModels,
  handleSetConfig,
  handleSetModel,
} from './handlers/configHandlers';
import {
  handleGetSession,
  handleGetSessions,
  handleLoadSession,
  handleNewSession,
} from './handlers/sessionHandlers';
import { sendErrorResponse, sendNoContentResponse } from './httpUtils';

export async function handleAPI(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
  method: string,
): Promise<boolean> {
  if (method === 'OPTIONS') {
    sendNoContentResponse(res);
    return true;
  }

  const match = pathname.match(/^\/api\/([^/]+)\/(.+)$/);
  if (!match) {
    return false;
  }

  const [, wsId, route] = match;
  const webSession = getWebSession(wsId);
  if (!webSession) {
    sendErrorResponse(res, 'Invalid session', 401);
    return true;
  }

  if (route === 'model' && method === 'GET') return handleGetModel(res, webSession);
  if (route === 'models' && method === 'GET') return handleGetModels(res);
  if (route === 'model' && method === 'POST') return handleSetModel(req, res, webSession);
  if (route === 'config' && method === 'GET') return handleGetConfig(res);
  if (route === 'config' && method === 'POST') return handleSetConfig(req, res);
  if (route === 'session' && method === 'GET') return handleGetSession(res, webSession);
  if (route === 'sessions' && method === 'GET') return handleGetSessions(res, webSession);
  if (route === 'session/load' && method === 'POST') {
    return handleLoadSession(req, res, webSession);
  }
  if (route === 'session/new' && method === 'POST') return handleNewSession(res, webSession);
  if (route === 'chat' && method === 'POST') return handleChat(req, res, webSession);
  if (route === 'chat/slashCommands' && method === 'GET') return handleGetSlashCommands(res);
  if (route === 'chat/stopGeneration' && method === 'POST') {
    return handleStopGeneration(res, webSession);
  }
  if (route === 'ide/context' && method === 'GET') return handleGetIDEContext(res);

  return false;
}
