import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AppConfig, DEFAULT_CONFIG, ModelConfig, OmxConfig } from '../types/config';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'omx');
const CONFIG_FILE = path.join(CONFIG_DIR, 'omx.json');

let currentConfig: AppConfig = DEFAULT_CONFIG;

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, {recursive: true});
  }
}

export function loadOmxConfig(): OmxConfig {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    const defaultConfig: OmxConfig = {models: [], enableThinking: false};
    saveOmxConfig(defaultConfig);
    return defaultConfig;
  }
  const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
  return JSON.parse(content);
}

export function saveOmxConfig(config: OmxConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function getDefaultModel(config: OmxConfig): ModelConfig | undefined {
  if (config.defaultModelId) {
    return config.models.find(m => m.id === config.defaultModelId);
  }
  return config.models[0];
}

export function setDefaultModel(modelId: string): void {
  const config = loadOmxConfig();
  config.defaultModelId = modelId;
  saveOmxConfig(config);
}

export function addModel(model: Omit<ModelConfig, 'id'>): void {
  const config = loadOmxConfig();
  const id = `${model.provider}-${Date.now()}`;
  config.models.push({...model, id});
  if (config.models.length === 1) {
    config.defaultModelId = id;
  }
  saveOmxConfig(config);
}

export function removeModel(modelId: string): void {
  const config = loadOmxConfig();
  config.models = config.models.filter(m => m.id !== modelId);

  if (config.defaultModelId === modelId) {
    config.defaultModelId = config.models[0]?.id;
  }

  saveOmxConfig(config);

  if (currentConfig.modelId === modelId) {
    const defaultModel = getDefaultModel(config);
    if (defaultModel) {
      currentConfig = modelConfigToAppConfig(defaultModel, config.enableThinking);
    } else {
      currentConfig = {...DEFAULT_CONFIG, enableThinking: config.enableThinking};
    }
  }
}

export function toggleThinking(): void {
  const config = loadOmxConfig();
  config.enableThinking = !config.enableThinking;
  saveOmxConfig(config);
}

export function modelConfigToAppConfig(model: ModelConfig, enableThinking: boolean): AppConfig {
  return {
    provider: model.provider,
    apiUrl: model.apiUrl,
    model: model.name,
    apiKey: model.apiKey,
    enableThinking,
    modelId: model.id,
  };
}

export function initializeAppConfig(): void {
  const omxConfig = loadOmxConfig();
  const defaultModel = getDefaultModel(omxConfig);

  if (defaultModel) {
    currentConfig = modelConfigToAppConfig(defaultModel, omxConfig.enableThinking);
  } else {
    currentConfig = {...DEFAULT_CONFIG, enableThinking: omxConfig.enableThinking};
  }
}

export function updateAppConfig(model: ModelConfig, enableThinking: boolean): void {
  currentConfig = modelConfigToAppConfig(model, enableThinking);
}

export function getAppConfig(): AppConfig {
  return currentConfig;
}
