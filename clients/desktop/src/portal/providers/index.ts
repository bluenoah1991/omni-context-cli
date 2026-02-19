import { DeepSeekProvider } from '../../../../../src/services/modelProviders/DeepSeekProvider';
import { MiniMaxProvider } from '../../../../../src/services/modelProviders/MiniMaxProvider';
import { OpenRouterProvider } from '../../../../../src/services/modelProviders/OpenRouterProvider';
import { ZenmuxProvider } from '../../../../../src/services/modelProviders/ZenmuxProvider';
import { ZhipuProvider } from '../../../../../src/services/modelProviders/ZhipuProvider';
import type { ModelConfig, ModelProvider } from '../../../../../src/types/config';

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
