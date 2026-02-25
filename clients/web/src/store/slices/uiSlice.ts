import type { StateCreator } from 'zustand';
import { fetchIDEContext } from '../../services/chatService';
import { fetchFileContent } from '../../services/fileService';
import type { IDEContext } from '../../types/ide';
import type { FileDiff, FilePreview, PreviewTab } from '../../types/uiMessage';
import type { ChatState } from '../chatStore';

export interface UISlice {
  error: string | null;
  theme: 'light' | 'dark';
  thinkingExpanded: boolean;
  toolExpanded: boolean;
  autoDiffPanel: boolean;
  inlineDiff: boolean;
  ideContext: IDEContext | null;
  pinnedIDEContexts: IDEContext[];
  pollInterval: ReturnType<typeof setInterval> | null;
  previewPanelOpen: boolean;
  previewPanelWidth: number;
  previewTabs: PreviewTab[];
  activePreviewTab: number;
  fileTreeOpen: boolean;
  fileTreeWidth: number;
  setTheme: (theme: 'light' | 'dark') => void;
  setThinkingExpanded: (expanded: boolean) => void;
  setToolExpanded: (expanded: boolean) => void;
  setAutoDiffPanel: (enabled: boolean) => void;
  setInlineDiff: (enabled: boolean) => void;
  startPolling: () => void;
  stopPolling: () => void;
  pinIDEContext: (ctx: IDEContext) => void;
  unpinIDEContext: (path: string) => void;
  openDiffPanel: (diff: FileDiff) => void;
  openFilePreview: (filePath: string) => void;
  pinPreviewTab: (index: number) => void;
  clearDiffTabs: () => void;
  closePreviewPanel: () => void;
  closePreviewTab: (index: number) => void;
  setActivePreviewTab: (index: number) => void;
  setPreviewPanelWidth: (width: number) => void;
  toggleFileTree: () => void;
  setFileTreeWidth: (width: number) => void;
}

function ensurePanelWidth(open: boolean, width: number, ratio = 0.3): number {
  return !open && width === 0 ? Math.round(window.innerWidth * ratio) : width;
}

export const createUISlice: StateCreator<ChatState, [], [], UISlice> = (set, get) => ({
  error: null,
  theme: 'dark',
  thinkingExpanded: localStorage.getItem('thinkingExpanded') !== 'false',
  toolExpanded: localStorage.getItem('toolExpanded') !== 'false',
  autoDiffPanel: localStorage.getItem('autoDiffPanel') === 'true',
  inlineDiff: localStorage.getItem('inlineDiff') !== 'false',
  ideContext: null,
  pinnedIDEContexts: [],
  pollInterval: null,
  previewPanelOpen: false,
  previewPanelWidth: 0,
  previewTabs: [],
  activePreviewTab: 0,
  fileTreeOpen: localStorage.getItem('fileTreeOpen') === 'true',
  fileTreeWidth: parseInt(localStorage.getItem('fileTreeWidth') || '0', 10) || 0,

  setTheme: theme => set({theme}),

  setThinkingExpanded: expanded => {
    localStorage.setItem('thinkingExpanded', String(expanded));
    set({thinkingExpanded: expanded});
  },

  setToolExpanded: expanded => {
    localStorage.setItem('toolExpanded', String(expanded));
    set({toolExpanded: expanded});
  },

  setAutoDiffPanel: enabled => {
    localStorage.setItem('autoDiffPanel', String(enabled));
    set({autoDiffPanel: enabled});
  },

  setInlineDiff: enabled => {
    localStorage.setItem('inlineDiff', String(enabled));
    set({inlineDiff: enabled});
  },

  startPolling: () => {
    const {pollInterval} = get();
    if (pollInterval) return;

    const poll = async () => {
      const {config} = get();
      if (!config?.ideContext) return;
      const {data} = await fetchIDEContext();
      set({ideContext: data});
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

  pinIDEContext: ctx => {
    const {pinnedIDEContexts} = get();
    if (pinnedIDEContexts.some(p => p.path === ctx.path)) return;
    set({pinnedIDEContexts: [...pinnedIDEContexts, ctx]});
  },

  unpinIDEContext: path => {
    set({pinnedIDEContexts: get().pinnedIDEContexts.filter(p => p.path !== path)});
  },

  openDiffPanel: diff => {
    const minWidth = 800;
    if (window.innerWidth < minWidth) return;

    const state = get();
    const {previewTabs} = state;
    const existingIndex = previewTabs.findIndex(t =>
      t.kind === 'diff' && t.data.filePath === diff.filePath && t.data.toolUseId === diff.toolUseId
    );
    const width = ensurePanelWidth(state.previewPanelOpen, state.previewPanelWidth);
    const tab: PreviewTab = {kind: 'diff', data: diff, pinned: true};

    if (existingIndex !== -1) {
      const newTabs = [...previewTabs];
      newTabs[existingIndex] = tab;
      set({
        previewPanelOpen: true,
        previewTabs: newTabs,
        activePreviewTab: existingIndex,
        previewPanelWidth: width,
      });
    } else {
      set({
        previewPanelOpen: true,
        previewTabs: [...previewTabs, tab],
        activePreviewTab: previewTabs.length,
        previewPanelWidth: width,
      });
    }
  },

  openFilePreview: async (filePath: string) => {
    const minWidth = 800;
    if (window.innerWidth < minWidth) return;

    const state = get();
    const {previewTabs} = state;

    const existingIndex = previewTabs.findIndex(t =>
      t.kind === 'file' && t.data.filePath === filePath
    );
    if (existingIndex !== -1) {
      set({previewPanelOpen: true, activePreviewTab: existingIndex});
      return;
    }

    const unpinnedIndex = previewTabs.findIndex(t => t.kind === 'file' && !t.pinned);
    const placeholder: FilePreview = {filePath, type: 'text', content: 'Loading...'};
    const tab: PreviewTab = {kind: 'file', data: placeholder, pinned: false};
    const width = ensurePanelWidth(state.previewPanelOpen, state.previewPanelWidth);

    let targetIndex: number;
    if (unpinnedIndex !== -1) {
      const newTabs = [...previewTabs];
      newTabs[unpinnedIndex] = tab;
      targetIndex = unpinnedIndex;
      set({
        previewPanelOpen: true,
        previewTabs: newTabs,
        activePreviewTab: targetIndex,
        previewPanelWidth: width,
      });
    } else {
      targetIndex = previewTabs.length;
      set({
        previewPanelOpen: true,
        previewTabs: [...previewTabs, tab],
        activePreviewTab: targetIndex,
        previewPanelWidth: width,
      });
    }

    const {data, error} = await fetchFileContent(filePath);
    const current = get().previewTabs;
    if (current[targetIndex]?.kind === 'file' && current[targetIndex].data.filePath === filePath) {
      const updated = [...current];
      updated[targetIndex] = {
        kind: 'file',
        data: data || {filePath, type: 'text', error: error || 'Failed to load'},
        pinned: false,
      };
      set({previewTabs: updated});
    }
  },

  pinPreviewTab: index => {
    const {previewTabs} = get();
    if (index < 0 || index >= previewTabs.length) return;
    const tab = previewTabs[index];
    if (tab.pinned) return;
    const updated = [...previewTabs];
    updated[index] = {...tab, pinned: true};
    set({previewTabs: updated});
  },

  clearDiffTabs: () => {
    const {previewTabs, activePreviewTab} = get();
    const kept = previewTabs.filter(t => t.kind !== 'diff');
    if (kept.length === 0) {
      set({previewPanelOpen: false, previewTabs: [], activePreviewTab: 0});
    } else {
      const newActive = Math.min(activePreviewTab, kept.length - 1);
      set({previewTabs: kept, activePreviewTab: newActive});
    }
  },

  closePreviewPanel: () => set({previewPanelOpen: false, previewTabs: [], activePreviewTab: 0}),

  closePreviewTab: index => {
    const {previewTabs, activePreviewTab} = get();
    const newTabs = previewTabs.filter((_, i) => i !== index);
    if (newTabs.length === 0) {
      set({previewTabs: [], previewPanelOpen: false, activePreviewTab: 0});
    } else {
      let newActive = activePreviewTab;
      if (activePreviewTab >= newTabs.length) {
        newActive = newTabs.length - 1;
      } else if (activePreviewTab > index) {
        newActive = activePreviewTab - 1;
      }
      set({previewTabs: newTabs, activePreviewTab: newActive});
    }
  },

  setActivePreviewTab: index => set({activePreviewTab: index}),

  setPreviewPanelWidth: width => set({previewPanelWidth: Math.max(300, width)}),

  toggleFileTree: () => {
    const {fileTreeOpen, fileTreeWidth} = get();
    const width = ensurePanelWidth(fileTreeOpen, fileTreeWidth);
    localStorage.setItem('fileTreeOpen', String(!fileTreeOpen));
    set({fileTreeOpen: !fileTreeOpen, fileTreeWidth: width});
  },

  setFileTreeWidth: width => {
    const clamped = Math.max(160, Math.min(width, 480));
    localStorage.setItem('fileTreeWidth', String(clamped));
    set({fileTreeWidth: clamped});
  },
});
