export type Provider = 'openai' | 'anthropic' | 'gemini' | 'responses';

export interface ModelConfig {
  id: string;
  name: string;
  nickname: string;
  provider: Provider;
  apiKey: string;
  apiUrl: string;
  contextSize: number;
}

export interface AppConfig {
  models: ModelConfig[];
  defaultModelId?: string;
  agentModelId?: string;
  enableThinking: boolean;
  streamingOutput: boolean;
  specialistMode: boolean;
  ideContext: boolean;
  playbookEnabled: boolean;
  cacheTtl?: '5m' | '1h';
  clientId?: string;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  models: [],
  enableThinking: true,
  streamingOutput: false,
  specialistMode: true,
  ideContext: true,
  playbookEnabled: false,
};
