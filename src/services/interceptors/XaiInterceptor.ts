import { ModelConfig } from '../../types/config';
import { RequestInterceptor } from '../requestInterceptor';

export class XaiInterceptor implements RequestInterceptor {
  shouldIntercept(model: ModelConfig): boolean {
    return model.name.toLowerCase().startsWith('x-ai');
  }

  interceptRequest(request: Record<string, unknown>): Record<string, unknown> {
    const {reasoning, ...rest} = request;
    return rest;
  }
}
