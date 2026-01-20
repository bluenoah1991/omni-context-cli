import { registerModelProvider } from '../modelProvider';
import { ZenmuxProvider } from './ZenmuxProvider';

export function initializeProviders(): void {
  registerModelProvider(ZenmuxProvider);
}
