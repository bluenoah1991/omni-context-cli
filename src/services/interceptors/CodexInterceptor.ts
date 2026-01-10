import { ModelConfig } from '../../types/config';
import { RequestInterceptor } from '../requestInterceptor';
import codexInstructions from './codex-instructions.txt';

export class CodexInterceptor implements RequestInterceptor {
  shouldIntercept(model: ModelConfig): boolean {
    if (model.provider !== 'responses') return false;
    if (model.apiUrl.includes('openrouter.ai')) return false;
    if (model.apiUrl.includes('zenmux.ai')) return false;
    return true;
  }

  interceptRequest(request: Record<string, unknown>, model: ModelConfig): Record<string, unknown> {
    const result: Record<string, unknown> = {...request, instructions: codexInstructions};

    if (request.reasoning) {
      const versionMatch = model.name.match(/(\d+\.\d+)/);
      if (versionMatch) {
        const version = parseFloat(versionMatch[1]);
        if (version >= 5.2) {
          result.reasoning = {effort: 'xhigh', summary: 'auto'};
        }
      }
    }

    return result;
  }
}
