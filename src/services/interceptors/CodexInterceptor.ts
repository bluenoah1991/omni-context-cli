import { ModelConfig } from '../../types/config';
import { InterceptorResult, RequestInterceptor } from '../requestInterceptor';

function reasoningEffort(name: string): string | undefined {
  const lower = name.toLowerCase();
  if (lower.includes('chat')) return 'medium';
  const match = lower.match(/(\d+\.\d+)/);
  if (match && parseFloat(match[1]) >= 5.2) return 'xhigh';
  return undefined;
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
    const effort = body.reasoning ? reasoningEffort(model.name) : undefined;
    if (effort) newBody.reasoning = {effort, summary: 'auto'};
    return {body: newBody, headers};
  }
}
