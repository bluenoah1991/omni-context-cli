import { ModelConfig } from '../types/config';

export interface RequestInterceptor {
  shouldIntercept(model: ModelConfig): boolean;
  interceptRequest(request: Record<string, unknown>, model: ModelConfig): Record<string, unknown>;
}

const interceptors: RequestInterceptor[] = [];

export function applyInterceptors(
  request: Record<string, unknown>,
  model: ModelConfig,
): Record<string, unknown> {
  let modifiedRequest = request;

  for (const interceptor of interceptors) {
    if (interceptor.shouldIntercept(model)) {
      modifiedRequest = interceptor.interceptRequest(modifiedRequest, model);
    }
  }

  return modifiedRequest;
}

export function registerInterceptor(interceptor: RequestInterceptor): void {
  interceptors.push(interceptor);
}
