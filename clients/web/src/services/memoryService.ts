import type { ApiResult } from '../types/api';
import { apiUrl } from '../utils/webSession';
import { apiFetch } from './apiFetch';

export interface KeyPoint {
  name: string;
  text: string;
  score: number;
}

export async function fetchMemory(): Promise<ApiResult<KeyPoint[]>> {
  try {
    const res = await apiFetch(apiUrl('memory'));
    if (!res.ok) throw new Error();
    return {data: await res.json(), error: null};
  } catch {
    return {data: null, error: 'Failed to load memory'};
  }
}

export async function saveMemory(keyPoints: KeyPoint[]): Promise<ApiResult<boolean>> {
  try {
    const res = await apiFetch(apiUrl('memory'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({keyPoints}),
    });
    if (!res.ok) throw new Error();
    return {data: true, error: null};
  } catch {
    return {data: null, error: 'Failed to save memory'};
  }
}
