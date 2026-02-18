import { registerInterceptor } from '../requestInterceptor';
import { AnthropicLegacyInterceptor } from './AnthropicLegacyInterceptor';
import { AnthropicNextInterceptor } from './AnthropicNextInterceptor';
import { CodexInterceptor } from './CodexInterceptor';
import { MiniMaxInterceptor } from './MiniMaxInterceptor';
import { XaiInterceptor } from './XaiInterceptor';
import { ZenmuxInterceptor } from './ZenmuxInterceptor';
import { ZhipuInterceptor } from './ZhipuInterceptor';

export function initializeInterceptors(): void {
  registerInterceptor(new AnthropicNextInterceptor());
  registerInterceptor(new AnthropicLegacyInterceptor());
  registerInterceptor(new CodexInterceptor());
  registerInterceptor(new MiniMaxInterceptor());
  registerInterceptor(new XaiInterceptor());
  registerInterceptor(new ZenmuxInterceptor());
  registerInterceptor(new ZhipuInterceptor());
}
