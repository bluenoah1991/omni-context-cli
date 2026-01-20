import { ModelConfig } from '../../types/config';
import { ModelProvider } from '../modelProvider';

interface OpenRouterModel {
  id: string;
  name?: string;
  context_length?: number;
}

interface OpenRouterModelResponse {
  data: OpenRouterModel[];
}

const OPENAI_PREFIXES = ['openai', 'google', 'x-ai', 'z-ai', 'deepseek', 'minimax'];
const ANTHROPIC_PREFIXES = ['anthropic'];

function matchesPrefix(id: string, prefixes: string[]): boolean {
  const lower = id.toLowerCase();
  return prefixes.some(p => lower.startsWith(p));
}

export const OpenRouterProvider: ModelProvider = {
  id: 'openrouter',
  name: 'OpenRouter',

  async listModels(apiKey: string): Promise<ModelConfig[]> {
    const response = await fetch('https://openrouter.ai/api/v1/models');

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data: OpenRouterModelResponse = await response.json();

    const openaiModels = data.data.filter(m => matchesPrefix(m.id, OPENAI_PREFIXES)).map(model => ({
      id: `openai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: model.id,
      nickname: `OpenRouter ${model.name || model.id}`,
      provider: 'openai' as const,
      apiKey,
      apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
      contextSize: model.context_length ? Math.floor(model.context_length / 1000) : 128,
    }));

    const anthropicModels = data.data.filter(m => matchesPrefix(m.id, ANTHROPIC_PREFIXES)).map(
      model => ({
        id: `anthropic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: model.id,
        nickname: `OpenRouter ${model.name || model.id}`,
        provider: 'anthropic' as const,
        apiKey,
        apiUrl: 'https://openrouter.ai/api/v1/messages',
        contextSize: model.context_length ? Math.floor(model.context_length / 1000) : 200,
      })
    );

    return [...openaiModels, ...anthropicModels].sort((a, b) => a.name.localeCompare(b.name));
  },
};
