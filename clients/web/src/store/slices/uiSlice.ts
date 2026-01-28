import type { StateCreator } from 'zustand';
import { fetchIDEContext } from '../../services/chatService';
import type { IDEContext } from '../../types/ide';
import type { FileDiff } from '../../types/uiMessage';
import type { ChatState } from '../chatStore';

export interface UISlice {
  error: string | null;
  theme: 'light' | 'dark';
  thinkingExpanded: boolean;
  autoDiffPanel: boolean;
  ideContext: IDEContext | null;
  pollInterval: ReturnType<typeof setInterval> | null;
  diffPanelOpen: boolean;
  diffPanelWidth: number;
  diffTabs: FileDiff[];
  activeDiffTab: number;
  setTheme: (theme: 'light' | 'dark') => void;
  setThinkingExpanded: (expanded: boolean) => void;
  setAutoDiffPanel: (enabled: boolean) => void;
  startPolling: () => void;
  stopPolling: () => void;
  openDiffPanel: (diff: FileDiff) => void;
  closeDiffPanel: () => void;
  closeDiffTab: (index: number) => void;
  setActiveDiffTab: (index: number) => void;
  setDiffPanelWidth: (width: number) => void;
}

export const createUISlice: StateCreator<ChatState, [], [], UISlice> = (set, get) => ({
  error: null,
  theme: 'dark',
  thinkingExpanded: localStorage.getItem('thinkingExpanded') !== 'false',
  autoDiffPanel: localStorage.getItem('autoDiffPanel') !== 'false',
  ideContext: null,
  pollInterval: null,
  diffPanelOpen: false,
  diffPanelWidth: 0,
  diffTabs: [],
  activeDiffTab: 0,

  setTheme: theme => set({theme}),

  setThinkingExpanded: expanded => {
    localStorage.setItem('thinkingExpanded', String(expanded));
    set({thinkingExpanded: expanded});
  },

  setAutoDiffPanel: enabled => {
    localStorage.setItem('autoDiffPanel', String(enabled));
    set({autoDiffPanel: enabled});
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

  openDiffPanel: diff => {
    const minWidth = 800;
    if (window.innerWidth < minWidth) return;

    const {diffTabs, diffPanelOpen, diffPanelWidth} = get();
    const existingIndex = diffTabs.findIndex(t =>
      t.filePath === diff.filePath && t.toolUseId === diff.toolUseId
    );
    const width = !diffPanelOpen && diffPanelWidth === 0
      ? Math.round(window.innerWidth * 0.4)
      : diffPanelWidth;
    if (existingIndex !== -1) {
      const newTabs = [...diffTabs];
      newTabs[existingIndex] = diff;
      set({
        diffPanelOpen: true,
        diffTabs: newTabs,
        activeDiffTab: existingIndex,
        diffPanelWidth: width,
      });
    } else {
      set({
        diffPanelOpen: true,
        diffTabs: [...diffTabs, diff],
        activeDiffTab: diffTabs.length,
        diffPanelWidth: width,
      });
    }
  },

  closeDiffPanel: () => set({diffPanelOpen: false, diffTabs: [], activeDiffTab: 0}),

  closeDiffTab: index => {
    const {diffTabs, activeDiffTab} = get();
    const newTabs = diffTabs.filter((_, i) => i !== index);
    let newActive = activeDiffTab;
    if (newTabs.length === 0) {
      set({diffTabs: [], diffPanelOpen: false, activeDiffTab: 0});
    } else {
      if (activeDiffTab >= newTabs.length) {
        newActive = newTabs.length - 1;
      } else if (activeDiffTab > index) {
        newActive = activeDiffTab - 1;
      }
      set({diffTabs: newTabs, activeDiffTab: newActive});
    }
  },

  setActiveDiffTab: index => set({activeDiffTab: index}),

  setDiffPanelWidth: width => set({diffPanelWidth: Math.max(300, width)}),
});
