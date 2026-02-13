import { ModelConfig } from '../../types/config';
import { ModelProvider } from '../modelProvider';

export const MiniMaxProvider: ModelProvider = {
  id: 'minimax',
  name: 'MiniMax Coding Plan',

  async listModels(apiKey: string): Promise<ModelConfig[]> {
    return [{
      id: `anthropic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: 'MiniMax-M2.5',
      nickname: 'MiniMax MiniMax-M2.5',
      provider: 'anthropic' as const,
      apiKey,
      apiUrl: 'https://api.minimaxi.com/anthropic/v1/messages',
      contextSize: 200,
    }];
  },
};
