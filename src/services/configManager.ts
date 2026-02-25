import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AppConfig, DEFAULT_APP_CONFIG, ModelConfig, WorkflowPreset } from '../types/config';
import { ensureDir, getOmxDir, getOmxFilePath, getProjectFilePath } from '../utils/omxPaths';

function generateClientId(): string {
  return crypto.randomUUID();
}

export type ConfigScope = 'global' | 'project' | 'memory';

let cachedAppConfig: AppConfig | undefined = undefined;
let currentModel: ModelConfig | undefined = undefined;
let memoryOverrides: Partial<AppConfig> = {};
let saveScope: ConfigScope = 'global';

export function setConfigScope(scope: ConfigScope): void {
  saveScope = scope;
}

export function setConfigOverride<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
  memoryOverrides[key] = value;
  cachedAppConfig = undefined;
}

export function readGlobalConfig(): Partial<AppConfig> {
  try {
    const content = fs.readFileSync(getOmxFilePath('omx.json'), 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function readProjectConfig(): Partial<AppConfig> {
  try {
    const projectPath = getProjectFilePath('omx.json');
    if (fs.existsSync(projectPath)) {
      return JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
    }
  } catch {}
  return {};
}

export function writeGlobalConfig(config: Partial<AppConfig>): void {
  ensureDir(getOmxDir());
  fs.writeFileSync(getOmxFilePath('omx.json'), JSON.stringify(config, null, 2), 'utf-8');
  cachedAppConfig = undefined;
}

function writeProjectConfig(config: Partial<AppConfig>): void {
  const dir = path.dirname(getProjectFilePath('omx.json'));
  ensureDir(dir);
  fs.writeFileSync(getProjectFilePath('omx.json'), JSON.stringify(config, null, 2), 'utf-8');
  cachedAppConfig = undefined;
}

export function loadAppConfig(): AppConfig {
  if (cachedAppConfig) {
    return cachedAppConfig;
  }

  ensureDir(getOmxDir());

  const globalConfig = readGlobalConfig();
  const projectConfig = readProjectConfig();

  const config: AppConfig = {
    ...DEFAULT_APP_CONFIG,
    ...globalConfig,
    ...projectConfig,
    ...memoryOverrides,
  };

  if (!config.clientId) {
    config.clientId = generateClientId();
    const global = readGlobalConfig();
    global.clientId = config.clientId;
    writeGlobalConfig(global);
  }

  cachedAppConfig = config;
  return config;
}

export function saveAppConfig<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
  memoryOverrides = {...memoryOverrides, [key]: value};

  if (saveScope === 'project' || saveScope === 'global') {
    const projectConfig = readProjectConfig();
    if (saveScope === 'project' || key in projectConfig) {
      projectConfig[key] = value;
      writeProjectConfig(projectConfig);
    }
  }

  if (saveScope === 'global') {
    const globalConfig = readGlobalConfig();
    (globalConfig as Partial<AppConfig>)[key] = value;
    writeGlobalConfig(globalConfig);
  }

  cachedAppConfig = undefined;
}

export function getDefaultModel(config: AppConfig): ModelConfig | undefined {
  if (config.defaultModelId) {
    const model = config.models.find(m => m.id === config.defaultModelId);
    if (model) return model;
  }
  return config.models[0];
}

export function setDefaultModel(modelId: string): void {
  saveAppConfig('defaultModelId', modelId);
}

export function getAgentModel(config: AppConfig): ModelConfig | undefined {
  if (config.agentModelId) {
    const model = config.models.find(m => m.id === config.agentModelId);
    if (model) return model;
  }
  return getDefaultModel(config);
}

export function setAgentModel(modelId: string): void {
  saveAppConfig('agentModelId', modelId);
}

export function addModel(model: Omit<ModelConfig, 'id'>): void {
  const global = readGlobalConfig();
  if (!global.models) global.models = [];
  const id = `${model.provider}-${Date.now()}`;
  global.models.push({...model, id} as ModelConfig);
  if (global.models.length === 1) {
    global.defaultModelId = id;
  }
  writeGlobalConfig(global);

  if (global.models.length === 1) {
    cachedAppConfig = undefined;
    const config = loadAppConfig();
    setCurrentModel(getDefaultModel(config));
  }
}

export function removeModel(modelId: string): void {
  const global = readGlobalConfig();
  if (!global.models) return;
  global.models = global.models.filter(m => m.id !== modelId);

  if (global.defaultModelId === modelId) {
    global.defaultModelId = global.models[0]?.id;
  }

  if (global.agentModelId === modelId) {
    global.agentModelId = undefined;
  }

  writeGlobalConfig(global);

  if (currentModel?.id === modelId) {
    cachedAppConfig = undefined;
    const config = loadAppConfig();
    setCurrentModel(getDefaultModel(config));
  }
}

export function setThinking(value: boolean): void {
  saveAppConfig('enableThinking', value);
}

export function setStreamingOutput(value: boolean): void {
  saveAppConfig('streamingOutput', value);
}

export function setWorkflowPreset(value: WorkflowPreset): void {
  saveAppConfig('workflowPreset', value);
}

export function setIDEContext(value: boolean): void {
  saveAppConfig('ideContext', value);
}

export function setMemoryEnabled(value: boolean): void {
  saveAppConfig('memoryEnabled', value);
}

export function setNotificationEnabled(value: boolean): void {
  saveAppConfig('notificationEnabled', value);
}

export function setCacheTtl(value: '5m' | '1h'): void {
  saveAppConfig('cacheTtl', value);
}

export function setServerCompaction(value: boolean): void {
  saveAppConfig('serverCompaction', value);
}

export function setContextEditing(value: boolean): void {
  saveAppConfig('contextEditing', value);
}

export function setWebTheme(value: 'dark' | 'light' | 'auto'): void {
  saveAppConfig('webTheme', value);
}

export function setLanguage(value: string): void {
  saveAppConfig('language', value);
}

export function setResponseLanguage(value: 'auto' | 'en' | 'zh'): void {
  saveAppConfig('responseLanguage', value);
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
  currentModel = model;
}

export function findModelById(modelId: string): ModelConfig | undefined {
  const config = loadAppConfig();
  return config.models.find(m => m.id === modelId);
}

export function findModelByName(keyword: string): ModelConfig | undefined {
  const config = loadAppConfig();
  const k = keyword.toLowerCase();
  return config.models.find(m => m.name.toLowerCase().includes(k));
}
