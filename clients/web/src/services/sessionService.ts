import type { ApiResult } from '../types/api';
import type { Session, SessionSummary } from '../types/session';
import { apiUrl } from '../utils/webSession';

export async function fetchSession(): Promise<ApiResult<Session>> {
  try {
    const res = await fetch(apiUrl('session'));
    if (res.status === 401) {
      window.location.href = '/';
      return {data: null, error: 'Session expired'};
    }
    return {data: await res.json(), error: null};
  } catch {
    return {data: null, error: 'Failed to load session'};
  }
}

export async function fetchSessions(): Promise<ApiResult<SessionSummary[]>> {
  try {
    const res = await fetch(apiUrl('sessions'));
    return {data: await res.json(), error: null};
  } catch {
    return {data: null, error: 'Failed to load sessions'};
  }
}

export async function loadSession(sessionId: string): Promise<ApiResult<Session>> {
  try {
    const res = await fetch(apiUrl('session/load'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({id: sessionId}),
    });
    if (!res.ok) {
      return {data: null, error: 'Failed to select session'};
    }
    return {data: await res.json(), error: null};
  } catch {
    return {data: null, error: 'Failed to select session'};
  }
}

export async function newSession(): Promise<ApiResult<Session>> {
  try {
    const res = await fetch(apiUrl('session/new'), {method: 'POST'});
    return {data: await res.json(), error: null};
  } catch {
    return {data: null, error: 'Failed to create session'};
  }
}
