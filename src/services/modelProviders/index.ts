import { registerModelProvider } from '../modelProvider';
import { DeepSeekProvider } from './DeepSeekProvider';
import { MiniMaxProvider } from './MiniMaxProvider';
import { OpenRouterProvider } from './OpenRouterProvider';
import { ZenmuxProvider } from './ZenmuxProvider';
import { ZhipuProvider } from './ZhipuProvider';

export function initializeProviders(): void {
  registerModelProvider(DeepSeekProvider);
  registerModelProvider(MiniMaxProvider);
  registerModelProvider(OpenRouterProvider);
  registerModelProvider(ZenmuxProvider);
  registerModelProvider(ZhipuProvider);
}
