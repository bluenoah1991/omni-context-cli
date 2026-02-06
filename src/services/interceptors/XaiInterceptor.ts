import { ModelConfig } from '../../types/config';
import { InterceptorResult, RequestInterceptor } from '../requestInterceptor';

export class XaiInterceptor implements RequestInterceptor {
  shouldIntercept(model: ModelConfig): boolean {
    return model.name.toLowerCase().startsWith('x-ai');
  }

  interceptRequest(
    body: Record<string, unknown>,
    headers: Record<string, string>,
    _model: ModelConfig,
  ): InterceptorResult {
    const {reasoning, ...rest} = body;
    return {body: rest, headers};
  }
}
