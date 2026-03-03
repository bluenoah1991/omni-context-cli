import { registerInterceptor } from '../requestInterceptor';
import { AnthropicLegacyInterceptor } from './AnthropicLegacyInterceptor';
import { AnthropicNextInterceptor } from './AnthropicNextInterceptor';
import { CodexInterceptor } from './CodexInterceptor';
import { GeminiLegacyInterceptor } from './GeminiLegacyInterceptor';
import { GlmInterceptor } from './GlmInterceptor';
import { MiniMaxInterceptor } from './MiniMaxInterceptor';
import { XaiInterceptor } from './XaiInterceptor';
import { ZenmuxInterceptor } from './ZenmuxInterceptor';

export function initializeInterceptors(): void {
  registerInterceptor(new AnthropicNextInterceptor());
  registerInterceptor(new AnthropicLegacyInterceptor());
  registerInterceptor(new CodexInterceptor());
  registerInterceptor(new GeminiLegacyInterceptor());
  registerInterceptor(new GlmInterceptor());
  registerInterceptor(new MiniMaxInterceptor());
  registerInterceptor(new XaiInterceptor());
  registerInterceptor(new ZenmuxInterceptor());
}
