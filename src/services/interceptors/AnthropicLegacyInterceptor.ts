import { ModelConfig } from '../../types/config';
import { loadAppConfig } from '../configManager';
import { InterceptorResult, RequestInterceptor } from '../requestInterceptor';

export class AnthropicLegacyInterceptor implements RequestInterceptor {
  shouldIntercept(model: ModelConfig): boolean {
    return model.provider === 'anthropic' && !/(?:opus|sonnet)-4[._-]6/.test(model.name);
  }

  interceptRequest(
    body: Record<string, unknown>,
    headers: Record<string, string>,
    _model: ModelConfig,
  ): InterceptorResult {
    const newBody = {...body};

    const thinking = newBody.thinking as {type: string;} | undefined;
    if (thinking?.type === 'adaptive') {
      newBody.thinking = {type: 'enabled', budget_tokens: 31999};
    }

    if (newBody.context_management) {
      delete newBody.context_management;
    }

    const newHeaders = {...headers};
    const betas = (newHeaders['anthropic-beta'] || '').split(',').filter(Boolean);
    if (loadAppConfig().enableThinking) {
      betas.push('interleaved-thinking-2025-05-14');
    }
    const filtered = betas.filter(b => b !== 'compact-2026-01-12');
    if (filtered.length) {
      newHeaders['anthropic-beta'] = filtered.join(',');
    } else {
      delete newHeaders['anthropic-beta'];
    }

    return {body: newBody, headers: newHeaders};
  }
}
