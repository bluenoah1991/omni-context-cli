import { AppConfig } from '../types/config';

export interface RequestInterceptor {
  shouldIntercept(config: AppConfig): boolean;
  interceptRequest(request: Record<string, unknown>, config: AppConfig): Record<string, unknown>;
}

const interceptors: RequestInterceptor[] = [];

export function applyInterceptors(
  request: Record<string, unknown>,
  config: AppConfig,
): Record<string, unknown> {
  let modifiedRequest = request;

  for (const interceptor of interceptors) {
    if (interceptor.shouldIntercept(config)) {
      modifiedRequest = interceptor.interceptRequest(modifiedRequest, config);
    }
  }

  return modifiedRequest;
}

export function registerInterceptor(interceptor: RequestInterceptor): void {
  interceptors.push(interceptor);
}
