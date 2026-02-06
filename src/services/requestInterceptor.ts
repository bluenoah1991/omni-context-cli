import { ModelConfig } from '../types/config';

export interface InterceptorResult {
  body: Record<string, unknown>;
  headers: Record<string, string>;
}

export interface RequestInterceptor {
  shouldIntercept(model: ModelConfig): boolean;
  interceptRequest(
    body: Record<string, unknown>,
    headers: Record<string, string>,
    model: ModelConfig,
  ): InterceptorResult;
}

const interceptors: RequestInterceptor[] = [];

export function applyInterceptors(
  body: Record<string, unknown>,
  headers: Record<string, string>,
  model: ModelConfig,
): InterceptorResult {
  let result: InterceptorResult = {body, headers};

  for (const interceptor of interceptors) {
    if (interceptor.shouldIntercept(model)) {
      result = interceptor.interceptRequest(result.body, result.headers, model);
    }
  }

  return result;
}

export function registerInterceptor(interceptor: RequestInterceptor): void {
  interceptors.push(interceptor);
}
