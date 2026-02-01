import http from 'node:http';
import path from 'node:path';
import { findModelById, loadAppConfig, saveAppConfig } from '../../configManager';
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
    webTheme: config.webTheme,
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

  const config = loadAppConfig();

  if ('defaultModelId' in body) config.defaultModelId = body.defaultModelId;
  if ('agentModelId' in body) config.agentModelId = body.agentModelId;
  if ('enableThinking' in body) config.enableThinking = body.enableThinking;
  if ('workflowPreset' in body) config.workflowPreset = body.workflowPreset;
  if ('ideContext' in body) config.ideContext = body.ideContext;
  if ('memoryEnabled' in body) config.memoryEnabled = body.memoryEnabled;
  if ('notificationEnabled' in body) config.notificationEnabled = body.notificationEnabled;
  if ('contextEditing' in body) config.contextEditing = body.contextEditing;
  if ('webTheme' in body) config.webTheme = body.webTheme;

  saveAppConfig(config);
  sendJsonResponse(res, {ok: true});
  return true;
}
