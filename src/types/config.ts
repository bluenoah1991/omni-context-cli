export type Provider = 'openai' | 'anthropic' | 'gemini' | 'responses' | 'none';

export type WorkflowPreset = 'normal' | 'specialist' | 'artist';

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
  contextEditing: boolean;
  contextEditingRounds: number;
  webTheme?: 'dark' | 'light' | 'auto';
  clientId?: string;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  models: [],
  enableThinking: true,
  streamingOutput: false,
  workflowPreset: 'specialist',
  ideContext: true,
  memoryEnabled: false,
  notificationEnabled: false,
  cacheTtl: '5m',
  contextEditing: true,
  contextEditingRounds: 0,
  webTheme: 'dark',
};
