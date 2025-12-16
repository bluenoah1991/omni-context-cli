export type Provider = 'openai' | 'anthropic';

export interface ModelConfig {
  id: string;
  name: string;
  nickname: string;
  provider: Provider;
  apiKey: string;
  apiUrl: string;
}

export interface OmxConfig {
  models: ModelConfig[];
  defaultModelId?: string;
  enableThinking: boolean;
}

export interface AppConfig {
  provider: Provider;
  apiUrl: string;
  model: string;
  apiKey: string;
  enableThinking?: boolean;
  modelId?: string;
}

export const DEFAULT_CONFIG: AppConfig = {
  provider: 'openai',
  apiUrl: '',
  model: '',
  apiKey: '',
  enableThinking: false,
};
