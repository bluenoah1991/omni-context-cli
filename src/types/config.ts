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

export const DEFAULT_OMX_CONFIG: OmxConfig = {
  models: [],
  enableThinking: true,
  streamingOutput: false,
  specialistMode: true,
};
