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

interface GeminiModel {
  name: string;
  displayName?: string;
  inputTokenLimit?: number;
}

interface GeminiModelResponse {
  models: GeminiModel[];
}

const ANTHROPIC_PREFIXES = ['anthropic', 'moonshotai', 'deepseek'];
const RESPONSES_PREFIXES = ['openai', 'x-ai'];
const GEMINI_PREFIXES = ['google'];
const OPENAI_PREFIXES = ['z-ai', 'minimax'];

function matchesPrefix(id: string, prefixes: string[]): boolean {
  const lower = id.toLowerCase();
  return prefixes.some(p => lower.startsWith(p));
}

export const ZenmuxProvider: ModelProvider = {
  id: 'zenmux',
  name: 'Zenmux',

  async listModels(apiKey: string): Promise<ModelConfig[]> {
    const [anthropicModels, responsesModels, geminiModels, openaiModels] = await Promise.all([
      fetchAnthropicModels(apiKey),
      fetchResponsesModels(apiKey),
      fetchGeminiModels(apiKey),
      fetchOpenAIModels(apiKey),
    ]);

    return [...anthropicModels, ...responsesModels, ...geminiModels, ...openaiModels].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  },
};

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

async function fetchResponsesModels(apiKey: string): Promise<ModelConfig[]> {
  const response = await fetch('https://zenmux.ai/api/v1/models');

  if (!response.ok) {
    throw new Error(`Failed to fetch Responses models: ${response.status}`);
  }

  const data: ZenmuxModelResponse = await response.json();

  return data.data.filter(m => matchesPrefix(m.id, RESPONSES_PREFIXES)).map(model => ({
    id: `responses-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: model.id,
    nickname: `Zenmux ${model.display_name || model.id}`,
    provider: 'responses' as const,
    apiKey,
    apiUrl: 'https://zenmux.ai/api/v1/responses',
    contextSize: model.context_length ? Math.floor(model.context_length / 1000) : 128,
  }));
}

async function fetchGeminiModels(apiKey: string): Promise<ModelConfig[]> {
  const response = await fetch('https://zenmux.ai/api/vertex-ai/v1beta/models');

  if (!response.ok) {
    throw new Error(`Failed to fetch Gemini models: ${response.status}`);
  }

  const data: GeminiModelResponse = await response.json();

  return data.models.filter(m => matchesPrefix(m.name, GEMINI_PREFIXES)).map(model => {
    const [publisher, ...rest] = model.name.split('/');
    const modelName = rest.join('/');

    return {
      id: `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: modelName,
      nickname: `Zenmux ${model.displayName || model.name}`,
      provider: 'gemini' as const,
      apiKey,
      apiUrl: `https://zenmux.ai/api/vertex-ai/v1/publishers/${publisher}`,
      contextSize: model.inputTokenLimit ? Math.floor(model.inputTokenLimit / 1000) : 1000,
    };
  });
}

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
