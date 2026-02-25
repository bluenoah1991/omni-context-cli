import http from 'node:http';
import path from 'node:path';
import {
  findModelById,
  loadAppConfig,
  setAgentModel,
  setCacheTtl,
  setContextEditing,
  setDefaultModel,
  setIDEContext,
  setLanguage,
  setMemoryEnabled,
  setNotificationEnabled,
  setServerCompaction,
  setThinking,
  setWebTheme,
  setWorkflowPreset,
} from '../../configManager';
import { WebSession } from '../../webSessionManager';
import {
  parseRequestBody,
  sendErrorResponse,
  sendJsonResponse,
  sendNoContentResponse,
} from '../httpUtils';

export function handleGetModel(res: http.ServerResponse, webSession: WebSession): boolean {
  const model = webSession.currentModel;
  if (!model) {
    sendNoContentResponse(res);
    return true;
  }
  sendJsonResponse(res, {
    id: model.id,
    name: model.name,
    nickname: model.nickname,
    provider: model.provider,
    contextSize: model.contextSize,
  });
  return true;
}

export function handleGetModels(res: http.ServerResponse): boolean {
  const config = loadAppConfig();
  sendJsonResponse(
    res,
    config.models.map(model => ({
      id: model.id,
      name: model.name,
      nickname: model.nickname,
      provider: model.provider,
      contextSize: model.contextSize,
    })),
  );
  return true;
}

export async function handleSetModel(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  webSession: WebSession,
): Promise<boolean> {
  const body = await parseRequestBody(req).catch(() => null);
  if (body === null) {
    sendErrorResponse(res, 'Invalid request body', 400);
    return true;
  }

  const modelId = body.modelId as string;
  if (!modelId) {
    sendErrorResponse(res, 'Missing modelId', 400);
    return true;
  }

  const model = findModelById(modelId);
  if (!model) {
    sendErrorResponse(res, 'Model not found', 400);
    return true;
  }

  const isProviderChanged = webSession.currentModel?.provider !== model.provider;
  webSession.currentModel = model;

  if (isProviderChanged) {
    webSession.chatSession = null;
  }

  sendJsonResponse(res, {ok: true});
  return true;
}

export function handleGetConfig(res: http.ServerResponse): boolean {
  const config = loadAppConfig();
  sendJsonResponse(res, {
    projectName: path.basename(process.cwd()),
    defaultModelId: config.defaultModelId || config.models[0]?.id,
    agentModelId: config.agentModelId,
    enableThinking: config.enableThinking ?? true,
    workflowPreset: config.workflowPreset ?? 'specialist',
    ideContext: config.ideContext ?? true,
    memoryEnabled: config.memoryEnabled ?? false,
    notificationEnabled: config.notificationEnabled ?? false,
    contextEditing: config.contextEditing ?? true,
    cacheTtl: config.cacheTtl ?? '5m',
    serverCompaction: config.serverCompaction ?? false,
    webTheme: config.webTheme,
    language: config.language,
  });
  return true;
}

export async function handleSetConfig(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<boolean> {
  const body = await parseRequestBody(req).catch(() => null);
  if (body === null) {
    sendErrorResponse(res, 'Invalid request body', 400);
    return true;
  }

  if ('defaultModelId' in body) setDefaultModel(body.defaultModelId);
  if ('agentModelId' in body) setAgentModel(body.agentModelId);
  if ('enableThinking' in body) setThinking(body.enableThinking);
  if ('workflowPreset' in body) setWorkflowPreset(body.workflowPreset);
  if ('ideContext' in body) setIDEContext(body.ideContext);
  if ('memoryEnabled' in body) setMemoryEnabled(body.memoryEnabled);
  if ('notificationEnabled' in body) setNotificationEnabled(body.notificationEnabled);
  if ('contextEditing' in body) setContextEditing(body.contextEditing);
  if ('cacheTtl' in body) setCacheTtl(body.cacheTtl);
  if ('serverCompaction' in body) setServerCompaction(body.serverCompaction);
  if ('webTheme' in body) setWebTheme(body.webTheme);
  if ('language' in body) setLanguage(body.language);
  sendJsonResponse(res, {ok: true});
  return true;
}
