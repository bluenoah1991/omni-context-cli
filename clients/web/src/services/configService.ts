import type { Config } from '../types/config';
import type { Model } from '../types/model';
import { apiUrl } from '../utils/webSession';

export type ApiResult<T> = {data: T; error: null;} | {data: null; error: string;};

export async function fetchModel(): Promise<ApiResult<Model | null>> {
  try {
    const res = await fetch(apiUrl('model'));
    if (res.status === 204) return {data: null, error: null};
    return {data: await res.json(), error: null};
  } catch {
    return {data: null, error: 'Failed to load model'};
  }
}

export async function setModel(modelId: string): Promise<ApiResult<void>> {
  try {
    await fetch(apiUrl('model'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({modelId}),
    });
    return {data: undefined, error: null};
  } catch {
    return {data: null, error: 'Failed to set model'};
  }
}

export async function fetchModels(): Promise<ApiResult<Model[]>> {
  try {
    const res = await fetch(apiUrl('models'));
    return {data: await res.json(), error: null};
  } catch {
    return {data: null, error: 'Failed to load models'};
  }
}

export async function fetchConfig(): Promise<ApiResult<Config>> {
  try {
    const res = await fetch(apiUrl('config'));
    return {data: await res.json(), error: null};
  } catch {
    return {data: null, error: 'Failed to load config'};
  }
}

export async function setConfig(config: Partial<Config>): Promise<ApiResult<void>> {
  try {
    await fetch(apiUrl('config'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(config),
    });
    return {data: undefined, error: null};
  } catch {
    return {data: null, error: 'Failed to update config'};
  }
}
