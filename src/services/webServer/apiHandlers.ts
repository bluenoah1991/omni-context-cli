import http from 'node:http';
import { getOrCreateWebSession } from '../webSessionManager';
import {
  handleAddInputHistory,
  handleChat,
  handleGetIDEContext,
  handleGetInputHistory,
  handleGetRewindPoints,
  handleGetSlashCommands,
  handleRewind,
  handleStopGeneration,
  handleToolApproval,
} from './handlers/chatHandlers';
import {
  handleGetConfig,
  handleGetModel,
  handleGetModels,
  handleSetConfig,
  handleSetModel,
} from './handlers/configHandlers';
import { handleListFiles, handleReadFile } from './handlers/fileHandlers';
import { handleGetMemory, handleUpdateMemory } from './handlers/memoryHandlers';
import { handleRemotePoll } from './handlers/remoteHandlers';
import {
  handleGetSession,
  handleGetSessions,
  handleLoadSession,
  handleNewSession,
} from './handlers/sessionHandlers';
import { sendNoContentResponse } from './httpUtils';

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

  if (pathname === '/api/health' && method === 'GET') {
    sendNoContentResponse(res);
    return true;
  }

  if (pathname === '/api/remote/poll' && method === 'POST') {
    return handleRemotePoll(req, res);
  }

  const match = pathname.match(/^\/api\/([^/]+)\/(.+)$/);
  if (!match) {
    return false;
  }

  const [, wsId, route] = match;
  const webSession = getOrCreateWebSession(wsId);

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
  if (route === 'chat/inputHistory' && method === 'GET') return handleGetInputHistory(res);
  if (route === 'chat/inputHistory' && method === 'POST') return handleAddInputHistory(req, res);
  if (route === 'chat/rewind' && method === 'POST') return handleRewind(req, res, webSession);
  if (route === 'chat/rewindPoints' && method === 'GET') {
    return handleGetRewindPoints(res, webSession);
  }
  if (route === 'chat/slashCommands' && method === 'GET') return handleGetSlashCommands(res);
  if (route === 'chat/stopGeneration' && method === 'POST') {
    return handleStopGeneration(res, webSession);
  }
  if (route === 'chat/toolApproval' && method === 'POST') {
    return handleToolApproval(req, res, webSession);
  }
  if (route === 'ide/context' && method === 'GET') return handleGetIDEContext(res);
  if (route === 'files' && method === 'GET') return handleListFiles(req, res);
  if (route === 'files/read' && method === 'GET') return handleReadFile(req, res);
  if (route === 'memory' && method === 'GET') return handleGetMemory(res);
  if (route === 'memory' && method === 'POST') return handleUpdateMemory(req, res);

  return false;
}
