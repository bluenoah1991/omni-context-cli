import type { StateCreator } from 'zustand';
import { fetchIDEContext } from '../../services/chatService';
import type { IDEContext } from '../../types/ide';
import type { ChatState } from '../chatStore';

export interface UISlice {
  error: string | null;
  theme: 'light' | 'dark';
  thinkingExpanded: boolean;
  ideContext: IDEContext | null;
  pollInterval: ReturnType<typeof setInterval> | null;
  setTheme: (theme: 'light' | 'dark') => void;
  setThinkingExpanded: (expanded: boolean) => void;
  startPolling: () => void;
  stopPolling: () => void;
}

export const createUISlice: StateCreator<ChatState, [], [], UISlice> = (set, get) => ({
  error: null,
  theme: 'dark',
  thinkingExpanded: localStorage.getItem('thinkingExpanded') !== 'false',
  ideContext: null,
  pollInterval: null,

  setTheme: theme => set({theme}),

  setThinkingExpanded: expanded => {
    localStorage.setItem('thinkingExpanded', String(expanded));
    set({thinkingExpanded: expanded});
  },

  startPolling: () => {
    const {pollInterval} = get();
    if (pollInterval) return;

    const poll = async () => {
      const {config} = get();
      if (!config?.ideContext) return;
      try {
        const context = await fetchIDEContext();
        set({ideContext: context});
      } catch {}
    };

    poll();
    const interval = setInterval(poll, 1000);
    set({pollInterval: interval});
  },

  stopPolling: () => {
    const {pollInterval} = get();
    if (pollInterval) {
      clearInterval(pollInterval);
      set({pollInterval: null});
    }
  },
});
