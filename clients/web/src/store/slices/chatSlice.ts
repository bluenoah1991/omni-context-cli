import type { StateCreator } from 'zustand';
import { sendChat, stopGeneration as apiStopGeneration } from '../../services/chatService';
import type { Session } from '../../types/session';
import type { UIMessage } from '../../types/uiMessage';
import type { ChatState } from '../chatStore';

export interface ChatSlice {
  isLoading: boolean;
  isCompacting: boolean;
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

  sendMessage: async (content: string, images?: Array<{base64: string; mediaType: string;}>) => {
    const {isLoading, currentModel, currentSession} = get();
    if (isLoading || !currentModel || !currentSession) return;

    if (content.trim() === '/clear') {
      get().newSession();
      return;
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
