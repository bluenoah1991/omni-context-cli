import type { ModelConfig, ModelProvider } from '../types/provider';

export const MiniMaxProvider: ModelProvider = {
  id: 'minimax',
  name: 'MiniMax Coding Plan',

  async listModels(apiKey: string): Promise<ModelConfig[]> {
    return [{
      id: `anthropic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: 'MiniMax-M2.1',
      nickname: 'MiniMax MiniMax-M2.1',
      provider: 'anthropic' as const,
      apiKey,
      apiUrl: 'https://api.minimaxi.com/anthropic/v1/messages',
      contextSize: 200,
    }];
  },
};
