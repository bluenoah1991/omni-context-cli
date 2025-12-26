import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AppConfig, DEFAULT_CONFIG, ModelConfig, OmxConfig } from '../types/config';

const CONFIG_DIR = path.join(os.homedir(), '.omx');
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
    const defaultConfig: OmxConfig = {
      models: [],
      enableThinking: true,
      streamingOutput: false,
      specialistMode: true,
    };
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

  if (currentConfig.modelId === modelId) {
    const previousProvider = currentConfig.provider;
    const defaultModel = getDefaultModel(config);
    if (defaultModel) {
      currentConfig = modelConfigToAppConfig(
        defaultModel,
        config.enableThinking,
        config.streamingOutput,
        config.specialistMode,
      );
      if (previousProvider !== currentConfig.provider) {
        const {useChatStore} = require('../store/chatStore');
        useChatStore.getState().createNewSession();
      }
    } else {
      currentConfig = {
        ...DEFAULT_CONFIG,
        enableThinking: config.enableThinking,
        streamingOutput: config.streamingOutput,
        specialistMode: config.specialistMode,
      };
    }
  }
}

export function toggleThinking(): void {
  const config = loadOmxConfig();
  config.enableThinking = !config.enableThinking;
  saveOmxConfig(config);
}

export function toggleStreamingOutput(): void {
  const config = loadOmxConfig();
  config.streamingOutput = !config.streamingOutput;
  saveOmxConfig(config);
}

export function toggleSpecialistMode(): void {
  const config = loadOmxConfig();
  config.specialistMode = !config.specialistMode;
  saveOmxConfig(config);
}

export function modelConfigToAppConfig(
  model: ModelConfig,
  enableThinking: boolean,
  streamingOutput: boolean,
  specialistMode: boolean,
): AppConfig {
  return {
    provider: model.provider,
    apiUrl: model.apiUrl,
    model: model.name,
    apiKey: model.apiKey,
    enableThinking,
    streamingOutput,
    specialistMode,
    modelId: model.id,
    nickname: model.nickname,
    contextSize: model.contextSize,
  };
}

export function initializeAppConfig(): void {
  const omxConfig = loadOmxConfig();

  const currentModel = currentConfig.modelId
    ? omxConfig.models.find(m => m.id === currentConfig.modelId)
    : undefined;

  if (currentModel) {
    currentConfig = {
      ...currentConfig,
      enableThinking: omxConfig.enableThinking,
      streamingOutput: omxConfig.streamingOutput,
      specialistMode: omxConfig.specialistMode,
    };
    return;
  }

  const defaultModel = getDefaultModel(omxConfig);
  currentConfig = defaultModel
    ? modelConfigToAppConfig(
      defaultModel,
      omxConfig.enableThinking,
      omxConfig.streamingOutput,
      omxConfig.specialistMode,
    )
    : {
      ...DEFAULT_CONFIG,
      enableThinking: omxConfig.enableThinking,
      streamingOutput: omxConfig.streamingOutput,
      specialistMode: omxConfig.specialistMode,
    };
}

export function updateAppConfig(
  model: ModelConfig,
  enableThinking: boolean,
  streamingOutput: boolean,
  specialistMode: boolean,
): void {
  const previousProvider = currentConfig.provider;
  currentConfig = modelConfigToAppConfig(model, enableThinking, streamingOutput, specialistMode);
  if (previousProvider !== currentConfig.provider) {
    const {useChatStore} = require('../store/chatStore');
    useChatStore.getState().createNewSession();
  }
}

export function getAppConfig(): AppConfig {
  return currentConfig;
}

export function findModelById(modelId: string): ModelConfig | undefined {
  const config = loadOmxConfig();
  return config.models.find(m => m.id === modelId);
}

export function findFirstModelByProvider(
  provider: 'anthropic' | 'openai',
): ModelConfig | undefined {
  const config = loadOmxConfig();
  return config.models.find(m => m.provider === provider);
}
