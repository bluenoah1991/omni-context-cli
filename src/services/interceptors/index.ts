import { registerInterceptor } from '../requestInterceptor';
import { MiniMaxInterceptor } from './MiniMaxInterceptor';
import { ZhipuInterceptor } from './ZhipuInterceptor';

export function initializeInterceptors(): void {
  registerInterceptor(new MiniMaxInterceptor());
  registerInterceptor(new ZhipuInterceptor());
}
