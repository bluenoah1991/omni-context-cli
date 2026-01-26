import { ModelConfig } from '../types/config';
import { Session } from '../types/session';
import { getDefaultModel, loadAppConfig } from './configManager';

export interface WebSession {
  id: string;
  currentModel: ModelConfig | null;
  chatSession: Session | null;
  abortController: AbortController | null;
}

const webSessions = new Map<string, WebSession>();

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createWebSession(): WebSession {
  const appConfig = loadAppConfig();
  const session: WebSession = {
    id: generateId(),
    currentModel: getDefaultModel(appConfig) ?? null,
    chatSession: null,
    abortController: null,
  };
  webSessions.set(session.id, session);
  return session;
}

export function getWebSession(id: string): WebSession | undefined {
  return webSessions.get(id);
}
