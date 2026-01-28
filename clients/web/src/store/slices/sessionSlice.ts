import type { StateCreator } from 'zustand';
import { fetchRewindPoints, rewindSession } from '../../services/chatService';
import {
  fetchSession,
  fetchSessions,
  loadSession,
  newSession,
} from '../../services/sessionService';
import type { RewindPoint } from '../../types/rewind';
import type { Session, SessionSummary } from '../../types/session';
import { preprocessMessages } from '../../utils/messagePreprocessor';
import type { ChatState } from '../chatStore';

export interface SessionSlice {
  currentSession: Session | null;
  sessions: SessionSummary[];
  getRewindPoints: () => Promise<RewindPoint[]>;
  getSession: () => Promise<void>;
  getSessions: () => Promise<void>;
  loadSession: (entry: SessionSummary) => Promise<void>;
  newSession: () => Promise<void>;
  rewind: (index: number) => Promise<void>;
}

export const createSessionSlice: StateCreator<ChatState, [], [], SessionSlice> = (set, get) => ({
  currentSession: null,
  sessions: [],

  getRewindPoints: async () => {
    const {data} = await fetchRewindPoints();
    return data || [];
  },

  getSession: async () => {
    const {data, error} = await fetchSession();
    if (error) set({error});
    else if (data) {
      set({currentSession: {...data, messages: preprocessMessages(data.messages || [])}});
    }
  },

  getSessions: async () => {
    const {currentModel} = get();
    if (!currentModel) return;
    const {data, error} = await fetchSessions();
    if (data) set({sessions: data});
    else if (error) set({error});
  },

  loadSession: async (entry: SessionSummary) => {
    set({currentSession: null});
    const {data, error} = await loadSession(entry.id);
    if (error) set({error});
    else if (data) {
      set({currentSession: {...data, messages: preprocessMessages(data.messages || [])}});
    }
  },

  newSession: async () => {
    const {data, error} = await newSession();
    if (error) set({error});
    else set({currentSession: data});
  },

  rewind: async (index: number) => {
    const {data, error} = await rewindSession(index);
    if (error) set({error});
    else if (data) {
      set({currentSession: {...data, messages: preprocessMessages(data.messages || [])}});
    }
  },
});
