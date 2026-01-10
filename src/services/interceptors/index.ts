import { registerInterceptor } from '../requestInterceptor';
import { CodexInterceptor } from './CodexInterceptor';
import { MiniMaxInterceptor } from './MiniMaxInterceptor';
import { ZenmuxInterceptor } from './ZenmuxInterceptor';
import { ZhipuInterceptor } from './ZhipuInterceptor';

export function initializeInterceptors(): void {
  registerInterceptor(new CodexInterceptor());
  registerInterceptor(new MiniMaxInterceptor());
  registerInterceptor(new ZenmuxInterceptor());
  registerInterceptor(new ZhipuInterceptor());
}
