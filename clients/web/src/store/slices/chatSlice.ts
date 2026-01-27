import type { StateCreator } from 'zustand';
import {
  addInputHistory,
  fetchInputHistory,
  fetchSlashCommands,
  sendChat,
  stopGeneration as apiStopGeneration,
} from '../../services/chatService';
import type { Session } from '../../types/session';
import type { SlashCommand } from '../../types/slash';
import type { UIMessage } from '../../types/uiMessage';
import type { ChatState } from '../chatStore';

export interface ChatSlice {
  isLoading: boolean;
  isCompacting: boolean;
  inputHistory: string[];
  slashCommands: SlashCommand[];
  getInputHistory: () => Promise<void>;
  getSlashCommands: () => Promise<void>;
  sendMessage: (
    content: string,
    images?: Array<{base64: string; mediaType: string;}>,
  ) => Promise<void>;
  stopGeneration: () => Promise<void>;
}

function appendMessage(session: Session, message: UIMessage): Session {
  const messageList = [...(session.messages || [])];
  const lastMessage = messageList[messageList.length - 1];

  if (message.role === 'tool_result') {
    const toolCallIndex = messageList.findLastIndex(item =>
      item.role === 'tool_call' && item.toolCallId === message.toolCallId
    );
    if (toolCallIndex !== -1) {
      messageList[toolCallIndex] = {...messageList[toolCallIndex], toolResult: message.content};
      return {...session, messages: messageList};
    }
  }

  const shouldAppend = (message.role === 'assistant' || message.role === 'thinking')
    && lastMessage?.role === message.role;
  if (shouldAppend) {
    messageList[messageList.length - 1] = {
      ...lastMessage,
      content: lastMessage.content + message.content,
    };
  } else {
    messageList.push(message);
  }
  return {...session, messages: messageList};
}

function updateSession(state: ChatState, session: Session, overwrite = false): Partial<ChatState> {
  const exists = state.sessions.some(s => s.id === session.id);
  return {
    currentSession: overwrite ? session : {...state.currentSession!, ...session},
    sessions: exists
      ? state.sessions.map(s => (s.id === session.id ? session : s))
      : [session, ...state.sessions],
  };
}

export const createChatSlice: StateCreator<ChatState, [], [], ChatSlice> = (set, get) => ({
  isLoading: false,
  isCompacting: false,
  inputHistory: [],
  slashCommands: [],

  getInputHistory: async () => {
    const history = await fetchInputHistory();
    set({inputHistory: history});
  },

  getSlashCommands: async () => {
    const commands = await fetchSlashCommands();
    set({slashCommands: commands});
  },

  sendMessage: async (content: string, images?: Array<{base64: string; mediaType: string;}>) => {
    const {isLoading, currentModel, currentSession, inputHistory} = get();
    if (isLoading || !currentModel || !currentSession) return;

    const trimmed = content.trim();
    if (trimmed === '/clear') {
      get().newSession();
      return;
    }

    if (
      trimmed && (inputHistory.length === 0 || inputHistory[inputHistory.length - 1] !== trimmed)
    ) {
      set({inputHistory: [...inputHistory, trimmed]});
      addInputHistory(trimmed);
    }

    set({isLoading: true, error: null});

    try {
      await sendChat({content, images}, {
        onMessage: message =>
          set(state => ({currentSession: appendMessage(state.currentSession!, message)})),
        onError: error => set({error}),
        onDone: session => set(state => updateSession(state, session)),
        onSessionUpdated: session =>
          set(state => ({...updateSession(state, session, true), isCompacting: false})),
        onCompacting: () => set({isCompacting: true}),
        onTokenUsage: usage =>
          set(state => ({
            currentSession: state.currentSession
              ? {...state.currentSession, ...usage}
              : state.currentSession,
          })),
      });
    } catch (err) {
      if (err instanceof Error) set({error: err.message});
    } finally {
      set({isLoading: false, isCompacting: false});
    }
  },

  stopGeneration: async () => {
    try {
      await apiStopGeneration();
    } catch {}
  },
});
