import { ModelConfig } from '../../types/config';
import { InterceptorResult, RequestInterceptor } from '../requestInterceptor';

function isMaxEffortModel(name: string): boolean {
  if (name.toLowerCase().includes('chat')) return false;
  const match = name.match(/(\d+\.\d+)/);
  return !!match && parseFloat(match[1]) >= 5.2;
}

export class CodexInterceptor implements RequestInterceptor {
  shouldIntercept(model: ModelConfig): boolean {
    return model.provider === 'responses';
  }

  interceptRequest(
    body: Record<string, unknown>,
    headers: Record<string, string>,
    model: ModelConfig,
  ): InterceptorResult {
    const newBody = {...body};
    if (body.reasoning && isMaxEffortModel(model.name)) {
      newBody.reasoning = {effort: 'xhigh', summary: 'detailed'};
    }
    return {body: newBody, headers};
  }
}
