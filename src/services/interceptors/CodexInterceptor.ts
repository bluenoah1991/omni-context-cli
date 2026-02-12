import { ModelConfig } from '../../types/config';
import { InterceptorResult, RequestInterceptor } from '../requestInterceptor';
import codexInstructions from './codex-instructions.txt';

export class CodexInterceptor implements RequestInterceptor {
  shouldIntercept(model: ModelConfig): boolean {
    return model.provider === 'responses';
  }

  interceptRequest(
    body: Record<string, unknown>,
    headers: Record<string, string>,
    model: ModelConfig,
  ): InterceptorResult {
    const isThirdParty = model.apiUrl.includes('openrouter.ai')
      || model.apiUrl.includes('zenmux.ai');
    const newBody: Record<string, unknown> = isThirdParty
      ? {...body}
      : {...body, instructions: codexInstructions};

    if (body.reasoning) {
      if (model.name.toLowerCase().includes('chat')) {
        newBody.reasoning = {effort: 'medium', summary: 'auto'};
      } else {
        const versionMatch = model.name.match(/(\d+\.\d+)/);
        if (versionMatch) {
          const version = parseFloat(versionMatch[1]);
          if (version >= 5.2) {
            newBody.reasoning = {effort: 'xhigh', summary: 'auto'};
          }
        }
      }
    }

    return {body: newBody, headers};
  }
}
