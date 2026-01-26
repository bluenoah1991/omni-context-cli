export type Provider = 'openai' | 'anthropic' | 'gemini' | 'responses' | 'none';

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
  specialistMode: boolean;
  ideContext: boolean;
  memoryEnabled: boolean;
  cacheTtl: '5m' | '1h';
  contextEditing: boolean;
  contextEditingRounds: number;
  clientId?: string;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  models: [],
  enableThinking: true,
  streamingOutput: false,
  specialistMode: true,
  ideContext: true,
  memoryEnabled: false,
  cacheTtl: '5m',
  contextEditing: true,
  contextEditingRounds: 0,
};
