import { create } from 'zustand';
import { getCurrentModel } from '../services/configManager';
import { sessionMessagesToUI } from '../services/messageConverter';
import { createSession } from '../services/sessionManager';
import { Session } from '../types/session';
import { UIMessage } from '../types/uiMessage';

interface ChatState {
  session: Session;
  messages: UIMessage[];
  isLoading: boolean;
  error: string | null;
  setSession: (session: Session) => void;
  updateSessionTokens: (inputTokens: number, outputTokens: number, cachedTokens: number) => void;
  createNewSession: () => void;
  updateMessages: (updater: (messages: UIMessage[]) => UIMessage[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  session: createSession(),
  messages: [],
  isLoading: false,
  error: null,

  setSession: (session: Session) => {
    const model = getCurrentModel();
    if (!model) {
      throw new Error('Cannot set session without a configured model');
    }
    const messages = sessionMessagesToUI(session.messages, model.provider);
    set({session, messages});
  },

  updateSessionTokens: (inputTokens, outputTokens, cachedTokens) => {
    const currentSession = get().session;
    set({session: {...currentSession, inputTokens, outputTokens, cachedTokens}});
  },

  createNewSession: () =>
    set({session: createSession(), messages: [], isLoading: false, error: null}),

  updateMessages: updater => set(state => ({messages: updater(state.messages)})),

  setLoading: isLoading => set(isLoading ? {isLoading, error: null} : {isLoading}),

  setError: error => set({error}),

  reset: () => set({session: createSession(), messages: [], isLoading: false, error: null}),
}));
