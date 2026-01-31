import { ModelConfig } from '../types/config';
import { Session } from '../types/session';
import { ToolCall } from '../types/streamCallbacks';
import { getDefaultModel, loadAppConfig } from './configManager';

interface PendingApproval {
  toolCall: ToolCall;
  resolve: (approved: boolean) => void;
}

export interface WebSession {
  id: string;
  currentModel: ModelConfig | null;
  chatSession: Session | null;
  abortController: AbortController | null;
  pendingApproval: PendingApproval | null;
}

const webSessions = new Map<string, WebSession>();

export function generateSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getOrCreateWebSession(id: string): WebSession {
  const existing = webSessions.get(id);
  if (existing) {
    return existing;
  }
  const appConfig = loadAppConfig();
  const session: WebSession = {
    id,
    currentModel: getDefaultModel(appConfig) ?? null,
    chatSession: null,
    abortController: null,
    pendingApproval: null,
  };
  webSessions.set(id, session);
  return session;
}
