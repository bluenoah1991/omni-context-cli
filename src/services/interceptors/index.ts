import { registerInterceptor } from '../requestInterceptor';
import { AnthropicLegacyInterceptor } from './AnthropicLegacyInterceptor';
import { AnthropicOpus46Interceptor } from './AnthropicOpus46Interceptor';
import { CodexInterceptor } from './CodexInterceptor';
import { MiniMaxInterceptor } from './MiniMaxInterceptor';
import { XaiInterceptor } from './XaiInterceptor';
import { ZenmuxInterceptor } from './ZenmuxInterceptor';
import { ZhipuInterceptor } from './ZhipuInterceptor';

export function initializeInterceptors(): void {
  registerInterceptor(new AnthropicOpus46Interceptor());
  registerInterceptor(new AnthropicLegacyInterceptor());
  registerInterceptor(new CodexInterceptor());
  registerInterceptor(new MiniMaxInterceptor());
  registerInterceptor(new XaiInterceptor());
  registerInterceptor(new ZenmuxInterceptor());
  registerInterceptor(new ZhipuInterceptor());
}
