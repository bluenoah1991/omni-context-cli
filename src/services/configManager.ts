import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { useChatStore } from '../store/chatStore';
import { DEFAULT_OMX_CONFIG, ModelConfig, OmxConfig } from '../types/config';

const CONFIG_DIR = path.join(os.homedir(), '.omx');
const CONFIG_FILE = path.join(CONFIG_DIR, 'omx.json');

let cachedOmxConfig: OmxConfig | undefined = undefined;
let currentModel: ModelConfig | undefined = undefined;

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, {recursive: true});
  }
}

export function loadOmxConfig(): OmxConfig {
  if (cachedOmxConfig) {
    return cachedOmxConfig;
  }

  ensureConfigDir();

  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const loadedConfig: OmxConfig = JSON.parse(content);
    cachedOmxConfig = loadedConfig;
    return loadedConfig;
  } catch {
    saveOmxConfig(DEFAULT_OMX_CONFIG);
    return DEFAULT_OMX_CONFIG;
  }
}

export function saveOmxConfig(config: OmxConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  cachedOmxConfig = config;
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

export function getAgentModel(config: OmxConfig): ModelConfig | undefined {
  if (config.agentModelId) {
    return config.models.find(m => m.id === config.agentModelId);
  }
  return getDefaultModel(config);
}

export function setAgentModel(modelId: string): void {
  const config = loadOmxConfig();
  config.agentModelId = modelId;
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

  if (currentModel?.id === modelId) {
    const defaultModel = getDefaultModel(config);
    setCurrentModel(defaultModel);
  }
}

export function setThinking(value: boolean): void {
  const config = loadOmxConfig();
  config.enableThinking = value;
  saveOmxConfig(config);
}

export function setStreamingOutput(value: boolean): void {
  const config = loadOmxConfig();
  config.streamingOutput = value;
  saveOmxConfig(config);
}

export function setSpecialistMode(value: boolean): void {
  const config = loadOmxConfig();
  config.specialistMode = value;
  saveOmxConfig(config);
}

export function initializeCurrentModel(): void {
  const omxConfig = loadOmxConfig();

  if (currentModel) {
    const stillExists = omxConfig.models.find(m => m.id === currentModel!.id);
    if (stillExists) {
      currentModel = stillExists;
      return;
    }
  }

  currentModel = getDefaultModel(omxConfig);
}

export function getCurrentModel(): ModelConfig | undefined {
  return currentModel;
}

export function setCurrentModel(model: ModelConfig | undefined): void {
  const previousProvider = currentModel?.provider;
  currentModel = model;
  if (previousProvider && previousProvider !== model?.provider) {
    useChatStore.getState().createNewSession();
  }
}

export function findModelById(modelId: string): ModelConfig | undefined {
  const config = loadOmxConfig();
  return config.models.find(m => m.id === modelId);
}
