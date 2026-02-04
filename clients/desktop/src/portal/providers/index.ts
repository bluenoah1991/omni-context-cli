import type { ModelConfig, ModelProvider } from '../types/provider';
import { DeepSeekProvider } from './DeepSeekProvider';
import { MiniMaxProvider } from './MiniMaxProvider';
import { OpenRouterProvider } from './OpenRouterProvider';
import { ZenmuxProvider } from './ZenmuxProvider';
import { ZhipuProvider } from './ZhipuProvider';

const providers: ModelProvider[] = [
  DeepSeekProvider,
  MiniMaxProvider,
  OpenRouterProvider,
  ZenmuxProvider,
  ZhipuProvider,
];

export function getAllProviders(): ModelProvider[] {
  return providers;
}

export function getProvider(id: string): ModelProvider | undefined {
  return providers.find(p => p.id === id);
}

export async function addProviderModels(
  providerId: string,
  apiKey: string,
  existingModels: ModelConfig[],
): Promise<ModelConfig[]> {
  const provider = getProvider(providerId);
  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  const models = await provider.listModels(apiKey);
  const filtered = existingModels.filter(m => m.source !== providerId);

  for (const model of models) {
    model.source = providerId;
  }

  return [...filtered, ...models];
}

export function removeProviderModels(
  providerId: string,
  existingModels: ModelConfig[],
): ModelConfig[] {
  return existingModels.filter(m => m.source !== providerId);
}
