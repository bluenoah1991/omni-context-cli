import crypto from 'node:crypto';
import fs from 'node:fs';
import { useChatStore } from '../store/chatStore';
import { AppConfig, DEFAULT_APP_CONFIG, ModelConfig } from '../types/config';
import { ensureDir, getOmxDir, getOmxFilePath } from '../utils/omxPaths';

function generateClientId(): string {
  return crypto.randomUUID();
}

let cachedAppConfig: AppConfig | undefined = undefined;
let currentModel: ModelConfig | undefined = undefined;

export function loadAppConfig(): AppConfig {
  if (cachedAppConfig) {
    return cachedAppConfig;
  }

  ensureDir(getOmxDir());

  try {
    const content = fs.readFileSync(getOmxFilePath('omx.json'), 'utf-8');
    const loadedConfig: AppConfig = JSON.parse(content);
    cachedAppConfig = {...DEFAULT_APP_CONFIG, ...loadedConfig};
    if (!cachedAppConfig.clientId) {
      cachedAppConfig.clientId = generateClientId();
      saveAppConfig(cachedAppConfig);
    }
    return cachedAppConfig;
  } catch {
    const config = {...DEFAULT_APP_CONFIG, clientId: generateClientId()};
    saveAppConfig(config);
    return config;
  }
}

export function saveAppConfig(config: AppConfig): void {
  ensureDir(getOmxDir());
  fs.writeFileSync(getOmxFilePath('omx.json'), JSON.stringify(config, null, 2), 'utf-8');
  cachedAppConfig = config;
}

export function getDefaultModel(config: AppConfig): ModelConfig | undefined {
  if (config.defaultModelId) {
    const model = config.models.find(m => m.id === config.defaultModelId);
    if (model) return model;
  }
  return config.models[0];
}

export function setDefaultModel(modelId: string): void {
  const config = loadAppConfig();
  config.defaultModelId = modelId;
  saveAppConfig(config);
}

export function getAgentModel(config: AppConfig): ModelConfig | undefined {
  if (config.agentModelId) {
    const model = config.models.find(m => m.id === config.agentModelId);
    if (model) return model;
  }
  return getDefaultModel(config);
}

export function setAgentModel(modelId: string): void {
  const config = loadAppConfig();
  config.agentModelId = modelId;
  saveAppConfig(config);
}

export function addModel(model: Omit<ModelConfig, 'id'>): void {
  const config = loadAppConfig();
  const id = `${model.provider}-${Date.now()}`;
  config.models.push({...model, id});
  if (config.models.length === 1) {
    config.defaultModelId = id;
  }
  saveAppConfig(config);

  if (config.models.length === 1) {
    const defaultModel = getDefaultModel(config);
    setCurrentModel(defaultModel);
  }
}

export function removeModel(modelId: string): void {
  const config = loadAppConfig();
  config.models = config.models.filter(m => m.id !== modelId);

  if (config.defaultModelId === modelId) {
    config.defaultModelId = config.models[0]?.id;
  }

  if (config.agentModelId === modelId) {
    config.agentModelId = undefined;
  }

  saveAppConfig(config);

  if (currentModel?.id === modelId) {
    const defaultModel = getDefaultModel(config);
    setCurrentModel(defaultModel);
  }
}

export function setThinking(value: boolean): void {
  const config = loadAppConfig();
  config.enableThinking = value;
  saveAppConfig(config);
}

export function setStreamingOutput(value: boolean): void {
  const config = loadAppConfig();
  config.streamingOutput = value;
  saveAppConfig(config);
}

export function setSpecialistMode(value: boolean): void {
  const config = loadAppConfig();
  config.specialistMode = value;
  saveAppConfig(config);
}

export function setIDEContext(value: boolean): void {
  const config = loadAppConfig();
  config.ideContext = value;
  saveAppConfig(config);
}

export function setMemoryEnabled(value: boolean): void {
  const config = loadAppConfig();
  config.memoryEnabled = value;
  saveAppConfig(config);
}

export function setCacheTtl(value: '5m' | '1h'): void {
  const config = loadAppConfig();
  config.cacheTtl = value;
  saveAppConfig(config);
}

export function setContextEditing(value: boolean): void {
  const config = loadAppConfig();
  config.contextEditing = value;
  saveAppConfig(config);
}

export function initializeCurrentModel(): void {
  const appConfig = loadAppConfig();

  if (currentModel) {
    const stillExists = appConfig.models.find(m => m.id === currentModel!.id);
    if (stillExists) {
      currentModel = stillExists;
      return;
    }
  }

  currentModel = getDefaultModel(appConfig);
}

export function getCurrentModel(): ModelConfig | undefined {
  return currentModel;
}

export function setCurrentModel(model: ModelConfig | undefined): void {
  const previousProvider = currentModel?.provider;
  currentModel = model;
  if (previousProvider && previousProvider !== model?.provider) {
    process.stdout.write('\x1Bc');
    useChatStore.getState().createNewSession();
  }
}

export function findModelById(modelId: string): ModelConfig | undefined {
  const config = loadAppConfig();
  return config.models.find(m => m.id === modelId);
}
