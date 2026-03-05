import { useChatStore } from '../store/chatStore';

const TOKEN_KEY = 'oc_auth_token';

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {}
}

export function getAuthToken(): string | null {
  if (!authToken) {
    try {
      authToken = localStorage.getItem(TOKEN_KEY);
    } catch {}
  }
  return authToken;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  if (token) {
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    init = {...init, headers};
  }
  const res = await fetch(input, init);
  const state = useChatStore.getState();
  if (res.status === 401) {
    setAuthToken(null);
    state.setNeedsAuth(true);
    throw new Error('Unauthorized');
  } else if (state.needsAuth === null) {
    state.setNeedsAuth(false);
  }
  return res;
}
