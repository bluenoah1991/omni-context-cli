import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { useChatStore } from '../store/chatStore';
import { AppConfig, DEFAULT_APP_CONFIG, ModelConfig } from '../types/config';

const CONFIG_DIR = path.join(os.homedir(), '.omx');
const CONFIG_FILE = path.join(CONFIG_DIR, 'omx.json');

let cachedAppConfig: AppConfig | undefined = undefined;
let currentModel: ModelConfig | undefined = undefined;

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, {recursive: true});
  }
}

export function loadAppConfig(): AppConfig {
  if (cachedAppConfig) {
    return cachedAppConfig;
  }

  ensureConfigDir();

  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const loadedConfig: AppConfig = JSON.parse(content);
    cachedAppConfig = {...DEFAULT_APP_CONFIG, ...loadedConfig};
    return cachedAppConfig;
  } catch {
    saveAppConfig(DEFAULT_APP_CONFIG);
    return DEFAULT_APP_CONFIG;
  }
}

export function saveAppConfig(config: AppConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  cachedAppConfig = config;
}

export function getDefaultModel(config: AppConfig): ModelConfig | undefined {
  if (config.defaultModelId) {
    return config.models.find(m => m.id === config.defaultModelId);
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
    return config.models.find(m => m.id === config.agentModelId);
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
}

export function removeModel(modelId: string): void {
  const config = loadAppConfig();
  config.models = config.models.filter(m => m.id !== modelId);

  if (config.defaultModelId === modelId) {
    config.defaultModelId = config.models[0]?.id;
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
