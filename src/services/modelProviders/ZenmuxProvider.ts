import { ModelConfig } from '../../types/config';
import { ModelProvider } from '../modelProvider';

interface ZenmuxModel {
  id: string;
  display_name?: string;
  context_length?: number;
}

interface ZenmuxModelResponse {
  data: ZenmuxModel[];
}

const OPENAI_PREFIXES = ['openai', 'google', 'x-ai'];
const ANTHROPIC_PREFIXES = ['anthropic', 'z-ai', 'deepseek', 'minimax'];

function matchesPrefix(id: string, prefixes: string[]): boolean {
  const lower = id.toLowerCase();
  return prefixes.some(p => lower.startsWith(p));
}

export const ZenmuxProvider: ModelProvider = {
  id: 'zenmux',
  name: 'Zenmux',

  async listModels(apiKey: string): Promise<ModelConfig[]> {
    const [openaiModels, anthropicModels] = await Promise.all([
      fetchOpenAIModels(apiKey),
      fetchAnthropicModels(apiKey),
    ]);

    return [...openaiModels, ...anthropicModels].sort((a, b) => a.name.localeCompare(b.name));
  },
};

async function fetchOpenAIModels(apiKey: string): Promise<ModelConfig[]> {
  const response = await fetch('https://zenmux.ai/api/v1/models');

  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAI models: ${response.status}`);
  }

  const data: ZenmuxModelResponse = await response.json();

  return data.data.filter(m => matchesPrefix(m.id, OPENAI_PREFIXES)).map(model => ({
    id: `openai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: model.id,
    nickname: `Zenmux ${model.display_name || model.id}`,
    provider: 'openai' as const,
    apiKey,
    apiUrl: 'https://zenmux.ai/api/v1/chat/completions',
    contextSize: model.context_length ? Math.floor(model.context_length / 1000) : 128,
  }));
}

async function fetchAnthropicModels(apiKey: string): Promise<ModelConfig[]> {
  const response = await fetch('https://zenmux.ai/api/anthropic/v1/models');

  if (!response.ok) {
    throw new Error(`Failed to fetch Anthropic models: ${response.status}`);
  }

  const data: ZenmuxModelResponse = await response.json();

  return data.data.filter(m => matchesPrefix(m.id, ANTHROPIC_PREFIXES)).map(model => ({
    id: `anthropic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: model.id,
    nickname: `Zenmux ${model.display_name || model.id}`,
    provider: 'anthropic' as const,
    apiKey,
    apiUrl: 'https://zenmux.ai/api/anthropic/v1/messages',
    contextSize: model.context_length ? Math.floor(model.context_length / 1000) : 200,
  }));
}
