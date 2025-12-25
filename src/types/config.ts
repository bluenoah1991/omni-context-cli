export type Provider = 'openai' | 'anthropic';

export interface ModelConfig {
  id: string;
  name: string;
  nickname: string;
  provider: Provider;
  apiKey: string;
  apiUrl: string;
  contextSize: number;
}

export interface OmxConfig {
  models: ModelConfig[];
  defaultModelId?: string;
  agentModelId?: string;
  enableThinking: boolean;
  streamingOutput: boolean;
  specialistMode: boolean;
}

export interface AppConfig {
  provider: Provider;
  apiUrl: string;
  model: string;
  apiKey: string;
  enableThinking?: boolean;
  streamingOutput?: boolean;
  specialistMode?: boolean;
  modelId?: string;
  nickname?: string;
  contextSize?: number;
}

export const DEFAULT_CONFIG: AppConfig = {
  provider: 'openai',
  apiUrl: '',
  model: '',
  apiKey: '',
  enableThinking: false,
  streamingOutput: false,
  specialistMode: false,
};
