import { create } from 'zustand';
import { createSession } from '../services/sessionManager';
import { Session } from '../types/session';
import { UIMessage } from '../types/uiMessage';

interface ChatState {
  session: Session;
  messages: UIMessage[];
  isLoading: boolean;
  currentThinking: string;
  currentContent: string;
  error: string | null;
  setSession: (session: Session) => void;
  addMessage: (message: UIMessage) => void;
  setMessages: (messages: UIMessage[]) => void;
  setLoading: (loading: boolean) => void;
  setCurrentThinking: (thinking: string) => void;
  appendCurrentThinking: (thinking: string) => void;
  setCurrentContent: (content: string) => void;
  appendCurrentContent: (content: string) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>(set => ({
  session: createSession(),
  messages: [],
  isLoading: false,
  currentThinking: '',
  currentContent: '',
  error: null,
  setSession: session => set({session}),
  addMessage: message => set(state => ({messages: [...state.messages, message]})),
  setMessages: messages => set({messages}),
  setLoading: isLoading => set({isLoading}),
  setCurrentThinking: currentThinking => set({currentThinking}),
  appendCurrentThinking: thinking =>
    set(state => ({currentThinking: state.currentThinking + thinking})),
  setCurrentContent: currentContent => set({currentContent}),
  appendCurrentContent: content => set(state => ({currentContent: state.currentContent + content})),
  setError: error => set({error}),
  reset: () =>
    set({
      session: createSession(),
      messages: [],
      isLoading: false,
      currentThinking: '',
      currentContent: '',
      error: null,
    }),
}));
