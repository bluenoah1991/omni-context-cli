import { create } from 'zustand';
import { getAllProviders } from '../providers';
import type { ApprovalMode, DesktopConfig, OmxConfig, Tab } from '../types/config';
import type { ProviderState } from '../types/provider';

export type PromptType = 'specialist' | 'artist' | 'explorer' | 'assistant';

export interface CustomPrompts {
  specialist: string | null;
  artist: string | null;
  explorer: string | null;
  assistant: string | null;
}

interface PortalState {
  omxConfig: OmxConfig;
  desktopConfig: DesktopConfig;
  loading: boolean;
  activeTab: Tab;
  selectedWorkspace: string;
  selectedProvider: string;
  apiKey: string;
  providerError: string;
  isAddingProvider: boolean;
  approvalMode: ApprovalMode;
  configuredProviders: ProviderState[];
  availableProviders: Array<{value: string; label: string;}>;
  canLaunch: boolean;
  customPrompts: CustomPrompts;
  selectedPromptType: PromptType;
  promptEditorValue: string;
  officeInstalled: boolean;
  officeRunning: boolean;
  officePort: number;
  lanAccess: boolean;
  fixedPort: number | null;
  language: string;

  setOmxConfig: (config: OmxConfig) => void;
  setDesktopConfig: (config: DesktopConfig) => void;
  setLoading: (loading: boolean) => void;
  setActiveTab: (tab: Tab) => void;
  setSelectedWorkspace: (workspace: string) => void;
  setSelectedProvider: (provider: string) => void;
  setApiKey: (key: string) => void;
  setProviderError: (error: string) => void;
  setIsAddingProvider: (adding: boolean) => void;
  setApprovalMode: (mode: ApprovalMode) => void;
  clearProviderForm: () => void;
  setCustomPrompts: (prompts: CustomPrompts) => void;
  setSelectedPromptType: (type: PromptType) => void;
  setPromptEditorValue: (value: string) => void;
  setOfficeStatus: (status: {installed: boolean; running: boolean; port: number;}) => void;
  setLanAccess: (enabled: boolean) => void;
  setFixedPort: (port: number | null) => void;
  setLanguage: (lang: string) => void;
}

function computeDerivedState(omxConfig: OmxConfig, selectedWorkspace: string) {
  const usedProviderIds = new Set(omxConfig.models.map(m => m.source).filter(Boolean) as string[]);
  const allProviders = getAllProviders();
  const configuredProviders: ProviderState[] = [];
  for (const pid of usedProviderIds) {
    const provider = allProviders.find(p => p.id === pid);
    if (provider) {
      const modelCount = omxConfig.models.filter(m => m.source === pid).length;
      configuredProviders.push({id: pid, name: provider.name, modelCount});
    }
  }
  const availableProviders = allProviders.filter(p => !usedProviderIds.has(p.id)).map(p => ({
    value: p.id,
    label: p.name,
  }));
  const canLaunch = !!selectedWorkspace && omxConfig.models.length > 0;
  return {configuredProviders, availableProviders, canLaunch};
}

export const usePortalStore = create<PortalState>()((set, get) => ({
  omxConfig: {models: []},
  desktopConfig: {workspaces: [], defaultWorkspace: ''},
  loading: true,
  activeTab: 'workspaces',
  selectedWorkspace: '',
  selectedProvider: '',
  apiKey: '',
  providerError: '',
  isAddingProvider: false,
  approvalMode: 'write',
  configuredProviders: [],
  availableProviders: getAllProviders().map(p => ({value: p.id, label: p.name})),
  canLaunch: false,
  customPrompts: {specialist: null, artist: null, explorer: null, assistant: null},
  selectedPromptType: 'specialist',
  promptEditorValue: '',
  officeInstalled: false,
  officeRunning: false,
  officePort: 52810,
  lanAccess: false,
  fixedPort: null,
  language: 'en-US',

  setOmxConfig: config => {
    const {selectedWorkspace} = get();
    set({omxConfig: config, ...computeDerivedState(config, selectedWorkspace)});
  },
  setDesktopConfig: config => set({desktopConfig: config}),
  setLoading: loading => set({loading}),
  setActiveTab: activeTab => set({activeTab}),
  setSelectedWorkspace: workspace => {
    const {omxConfig} = get();
    set({selectedWorkspace: workspace, ...computeDerivedState(omxConfig, workspace)});
  },
  setSelectedProvider: provider => set({selectedProvider: provider}),
  setApiKey: key => set({apiKey: key}),
  setProviderError: error => set({providerError: error}),
  setIsAddingProvider: adding => set({isAddingProvider: adding}),
  setApprovalMode: mode => set({approvalMode: mode}),
  clearProviderForm: () => set({selectedProvider: '', apiKey: '', providerError: ''}),
  setCustomPrompts: prompts => set({customPrompts: prompts}),
  setSelectedPromptType: type => {
    const {customPrompts} = get();
    set({selectedPromptType: type, promptEditorValue: customPrompts[type] ?? ''});
  },
  setPromptEditorValue: value => set({promptEditorValue: value}),
  setOfficeStatus: status =>
    set({
      officeInstalled: status.installed,
      officeRunning: status.running,
      officePort: status.port,
    }),
  setLanAccess: enabled => set({lanAccess: enabled}),
  setFixedPort: port => set({fixedPort: port}),
  setLanguage: lang => set({language: lang}),
}));
