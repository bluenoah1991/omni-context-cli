export type Provider = 'openai' | 'anthropic' | 'gemini' | 'responses' | 'none';

export type WorkflowPreset = 'normal' | 'specialist' | 'artist' | 'explorer' | 'assistant';

export interface ModelConfig {
  id: string;
  name: string;
  nickname: string;
  provider: Provider;
  apiKey: string;
  apiUrl: string;
  contextSize: number;
  source?: string;
}

export interface ModelProvider {
  readonly id: string;
  readonly name: string;
  listModels(apiKey: string): Promise<ModelConfig[]>;
}

export interface AppConfig {
  models: ModelConfig[];
  defaultModelId?: string;
  agentModelId?: string;
  enableThinking: boolean;
  streamingOutput: boolean;
  workflowPreset: WorkflowPreset;
  ideContext: boolean;
  memoryEnabled: boolean;
  notificationEnabled: boolean;
  cacheTtl: '5m' | '1h';
  serverCompaction: boolean;
  contextEditing: boolean;
  contextEditingRounds: number;
  webTheme?: 'dark' | 'light' | 'auto';
  clientId?: string;
  proxy?: string;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  models: [],
  enableThinking: true,
  streamingOutput: false,
  workflowPreset: 'specialist',
  ideContext: true,
  memoryEnabled: true,
  notificationEnabled: false,
  cacheTtl: '5m',
  serverCompaction: false,
  contextEditing: true,
  contextEditingRounds: 0,
  webTheme: 'auto',
};
