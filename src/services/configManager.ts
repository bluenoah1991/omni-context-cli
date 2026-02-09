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

function loadGlobalConfig(): Partial<AppConfig> {
  try {
    const content = fs.readFileSync(getOmxFilePath('omx.json'), 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function loadProjectConfig(): Partial<AppConfig> {
  try {
    const projectPath = getProjectFilePath('omx.json');
    if (fs.existsSync(projectPath)) {
      return JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
    }
  } catch {}
  return {};
}

function loadScopedConfig(): Partial<AppConfig> {
  if (saveScope === 'memory') return {...memoryOverrides};
  if (saveScope === 'project') return loadProjectConfig();
  return loadGlobalConfig();
}

function saveScopedConfig(config: Partial<AppConfig>): void {
  if (saveScope === 'memory') {
    memoryOverrides = config;
  } else if (saveScope === 'project') {
    const dir = path.dirname(getProjectFilePath('omx.json'));
    ensureDir(dir);
    fs.writeFileSync(getProjectFilePath('omx.json'), JSON.stringify(config, null, 2), 'utf-8');
  } else {
    ensureDir(getOmxDir());
    fs.writeFileSync(getOmxFilePath('omx.json'), JSON.stringify(config, null, 2), 'utf-8');
  }
  cachedAppConfig = undefined;
}

export function loadAppConfig(): AppConfig {
  if (cachedAppConfig) {
    return cachedAppConfig;
  }

  ensureDir(getOmxDir());

  const globalConfig = loadGlobalConfig();
  const projectConfig = loadProjectConfig();

  const config: AppConfig = {
    ...DEFAULT_APP_CONFIG,
    ...globalConfig,
    ...projectConfig,
    ...memoryOverrides,
  };

  if (!config.clientId) {
    config.clientId = generateClientId();
    saveAppConfig(config);
  }

  cachedAppConfig = config;
  return config;
}

export function saveAppConfig(config: AppConfig): void {
  ensureDir(getOmxDir());
  fs.writeFileSync(getOmxFilePath('omx.json'), JSON.stringify(config, null, 2), 'utf-8');
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
  const scoped = loadScopedConfig();
  scoped.defaultModelId = modelId;
  saveScopedConfig(scoped);
}

export function getAgentModel(config: AppConfig): ModelConfig | undefined {
  if (config.agentModelId) {
    const model = config.models.find(m => m.id === config.agentModelId);
    if (model) return model;
  }
  return getDefaultModel(config);
}

export function setAgentModel(modelId: string): void {
  const scoped = loadScopedConfig();
  scoped.agentModelId = modelId;
  saveScopedConfig(scoped);
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
  const scoped = loadScopedConfig();
  scoped.enableThinking = value;
  saveScopedConfig(scoped);
}

export function setStreamingOutput(value: boolean): void {
  const scoped = loadScopedConfig();
  scoped.streamingOutput = value;
  saveScopedConfig(scoped);
}

export function setWorkflowPreset(value: WorkflowPreset): void {
  const scoped = loadScopedConfig();
  scoped.workflowPreset = value;
  saveScopedConfig(scoped);
}

export function setIDEContext(value: boolean): void {
  const scoped = loadScopedConfig();
  scoped.ideContext = value;
  saveScopedConfig(scoped);
}

export function setMemoryEnabled(value: boolean): void {
  const scoped = loadScopedConfig();
  scoped.memoryEnabled = value;
  saveScopedConfig(scoped);
}

export function setNotificationEnabled(value: boolean): void {
  const scoped = loadScopedConfig();
  scoped.notificationEnabled = value;
  saveScopedConfig(scoped);
}

export function setCacheTtl(value: '5m' | '1h'): void {
  const scoped = loadScopedConfig();
  scoped.cacheTtl = value;
  saveScopedConfig(scoped);
}

export function setServerCompaction(value: boolean): void {
  const scoped = loadScopedConfig();
  scoped.serverCompaction = value;
  saveScopedConfig(scoped);
}

export function setContextEditing(value: boolean): void {
  const scoped = loadScopedConfig();
  scoped.contextEditing = value;
  saveScopedConfig(scoped);
}

export function setWebTheme(value: 'dark' | 'light' | 'auto'): void {
  const scoped = loadScopedConfig();
  scoped.webTheme = value;
  saveScopedConfig(scoped);
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
