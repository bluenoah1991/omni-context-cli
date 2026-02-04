export type Provider = 'openai' | 'anthropic' | 'gemini' | 'responses';

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

export interface ProviderState {
  id: string;
  name: string;
  modelCount: number;
}
