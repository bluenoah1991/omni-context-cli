import { create } from 'zustand';
import { getAppConfig } from '../services/configManager';
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
    const config = getAppConfig();
    const messages = sessionMessagesToUI(session.messages, config.provider);
    set({session, messages});
  },

  createNewSession: () =>
    set({session: createSession(), messages: [], isLoading: false, error: null}),

  updateMessages: updater => set(state => ({messages: updater(state.messages)})),

  setLoading: isLoading => set({isLoading}),

  setError: error => set({error}),

  reset: () => set({session: createSession(), messages: [], isLoading: false, error: null}),
}));
