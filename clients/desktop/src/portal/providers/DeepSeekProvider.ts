import type { ModelConfig, ModelProvider } from '../types/provider';

const MODELS: Array<{name: string; displayName: string;}> = [{
  name: 'deepseek-chat',
  displayName: 'DeepSeek-Chat',
}, {name: 'deepseek-reasoner', displayName: 'DeepSeek-Reasoner'}];

export const DeepSeekProvider: ModelProvider = {
  id: 'deepseek',
  name: 'DeepSeek',

  async listModels(apiKey: string): Promise<ModelConfig[]> {
    return MODELS.map(model => ({
      id: `anthropic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: model.name,
      nickname: `DeepSeek ${model.displayName}`,
      provider: 'anthropic' as const,
      apiKey,
      apiUrl: 'https://api.deepseek.com/anthropic/v1/messages',
      contextSize: 128,
    }));
  },
};
