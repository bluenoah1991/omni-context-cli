import { globalApiUrl } from '../utils/webSession';
import { getAuthToken, setAuthToken } from './apiFetch';

export interface LoginResult {
  ok: boolean;
  error?: string;
  retryAfter?: number;
  status: number;
}

export async function checkAuth(): Promise<boolean> {
  try {
    const headers: Record<string, string> = {};
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(globalApiUrl('auth/check'), {headers});
    return res.ok;
  } catch {
    return false;
  }
}

export async function login(password: string): Promise<LoginResult> {
  try {
    const res = await fetch(globalApiUrl('auth/login'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({password}),
    });
    const data = await res.json();
    if (data.ok && data.token) {
      setAuthToken(data.token);
    }
    return {...data, status: res.status};
  } catch {
    return {ok: false, error: 'Connection failed', status: 0};
  }
}
