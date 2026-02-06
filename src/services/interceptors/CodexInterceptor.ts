import { ModelConfig } from '../../types/config';
import { InterceptorResult, RequestInterceptor } from '../requestInterceptor';
import codexInstructions from './codex-instructions.txt';

export class CodexInterceptor implements RequestInterceptor {
  shouldIntercept(model: ModelConfig): boolean {
    if (model.provider !== 'responses') return false;
    if (model.apiUrl.includes('openrouter.ai')) return false;
    if (model.apiUrl.includes('zenmux.ai')) return false;
    return true;
  }

  interceptRequest(
    body: Record<string, unknown>,
    headers: Record<string, string>,
    model: ModelConfig,
  ): InterceptorResult {
    const newBody: Record<string, unknown> = {...body, instructions: codexInstructions};

    if (body.reasoning) {
      const versionMatch = model.name.match(/(\d+\.\d+)/);
      if (versionMatch) {
        const version = parseFloat(versionMatch[1]);
        if (version >= 5.2) {
          newBody.reasoning = {effort: 'xhigh', summary: 'auto'};
        }
      }
    }

    return {body: newBody, headers};
  }
}
