export type Provider = 'openai' | 'anthropic';

export interface AppConfig {
  provider: Provider;
  apiUrl: string;
  model: string;
  apiKey: string;
  enableThinking?: boolean;
}

export const DEFAULT_CONFIG: AppConfig = {
  provider: 'openai',
  apiUrl: '',
  model: '',
  apiKey: '',
  enableThinking: false,
};
