import type { StateCreator } from 'zustand';
import {
  addInputHistory,
  fetchInputHistory,
  fetchSlashCommands,
  sendChat,
  sendToolApproval,
  stopGeneration as apiStopGeneration,
  type ToolApprovalRequest,
} from '../../services/chatService';
import type { Session } from '../../types/session';
import type { SlashCommand } from '../../types/slash';
import type { UIMessage } from '../../types/uiMessage';
import { preprocessMessages } from '../../utils/messagePreprocessor';
import type { ChatState } from '../chatStore';

export interface ChatSlice {
  isLoading: boolean;
  isCompacting: boolean;
  inputHistory: string[];
  slashCommands: SlashCommand[];
  pendingApproval: ToolApprovalRequest | null;
  getInputHistory: () => Promise<void>;
  getSlashCommands: () => Promise<void>;
  sendMessage: (
    content: string,
    attachments?: Array<{base64: string; mediaType: string; fileName?: string;}>,
  ) => Promise<void>;
  stopGeneration: () => Promise<void>;
  handleToolApproval: (approved: boolean) => Promise<void>;
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

function appendMedia(session: Session, media: {url: string; mimeType: string;}): Session {
  const messageList = [...(session.messages || [])];
  const lastMessage = messageList[messageList.length - 1];

  if (lastMessage?.role === 'assistant') {
    messageList[messageList.length - 1] = {
      ...lastMessage,
      attachments: [...(lastMessage.attachments || []), media],
    };
  } else {
    messageList.push({role: 'assistant', content: '', timestamp: Date.now(), attachments: [media]});
  }
  return {...session, messages: messageList};
}

function autoOpenDiff(message: UIMessage, state: ChatState): void {
  if (message.role !== 'tool_result' || !state.autoDiffPanel) return;
  try {
    const parsed = JSON.parse(message.content);
    if (parsed.success && parsed.diffs) {
      parsed.diffs.forEach((diff: any) =>
        state.openDiffPanel({...diff, toolUseId: message.toolCallId})
      );
    }
  } catch {}
}

function updateSession(state: ChatState, session: Session, overwrite = false): Partial<ChatState> {
  const exists = state.sessions.some(s => s.id === session.id);
  const processed = session.messages
    ? {...session, messages: preprocessMessages(session.messages)}
    : session;
  return {
    currentSession: overwrite ? processed : {...state.currentSession!, ...processed},
    sessions: exists
      ? state.sessions.map(s => (s.id === session.id ? processed : s))
      : [processed, ...state.sessions],
  };
}

export const createChatSlice: StateCreator<ChatState, [], [], ChatSlice> = (set, get) => ({
  isLoading: false,
  isCompacting: false,
  inputHistory: [],
  slashCommands: [],
  pendingApproval: null,

  getInputHistory: async () => {
    const {data, error} = await fetchInputHistory();
    if (data) set({inputHistory: data});
    else if (error) set({error});
  },

  getSlashCommands: async () => {
    const {data, error} = await fetchSlashCommands();
    if (data) set({slashCommands: data});
    else if (error) set({error});
  },

  sendMessage: async (
    content: string,
    attachments?: Array<{base64: string; mediaType: string; fileName?: string;}>,
  ) => {
    const {isLoading, currentModel, currentSession, inputHistory, autoDiffPanel, closeDiffPanel} =
      get();
    if (isLoading || !currentModel || !currentSession) return;

    const trimmed = content.trim();
    if (trimmed === '/clear') {
      get().newSession();
      return;
    }

    if (autoDiffPanel) {
      closeDiffPanel();
    }

    if (
      trimmed && (inputHistory.length === 0 || inputHistory[inputHistory.length - 1] !== trimmed)
    ) {
      set({inputHistory: [...inputHistory, trimmed]});
      addInputHistory(trimmed);
    }

    set({isLoading: true, error: null});

    try {
      await sendChat({content, attachments}, {
        onMessage: message => {
          set(state => ({currentSession: appendMessage(state.currentSession!, message)}));
          autoOpenDiff(message, get());
        },
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
        onToolApproval: request => set({pendingApproval: request}),
        onMedia: media =>
          set(state => ({currentSession: appendMedia(state.currentSession!, media)})),
      });
    } catch (err) {
      if (err instanceof Error) set({error: err.message});
    } finally {
      set({isLoading: false, isCompacting: false});
    }
  },

  stopGeneration: async () => {
    await apiStopGeneration();
  },

  handleToolApproval: async (approved: boolean) => {
    set({pendingApproval: null});
    await sendToolApproval(approved);
  },
});
