import type { StateCreator } from 'zustand';
import {
  fetchConfig,
  fetchModel,
  fetchModels,
  setConfig,
  setModel,
} from '../../services/configService';
import type { Config } from '../../types/config';
import type { Model } from '../../types/model';
import type { ChatState } from '../chatStore';

export interface ConfigSlice {
  currentModel: Model | null;
  models: Model[];
  config: Config | null;
  getModel: () => Promise<void>;
  setCurrentModel: (model: Model) => Promise<void>;
  getModels: () => Promise<void>;
  getConfig: () => Promise<void>;
  setConfig: (config: Partial<Config>) => Promise<void>;
}

export const createConfigSlice: StateCreator<ChatState, [], [], ConfigSlice> = (set, get) => ({
  currentModel: null,
  models: [],
  config: null,

  getModel: async () => {
    const {data, error} = await fetchModel();
    if (error) set({error});
    else set({currentModel: data});
  },

  setCurrentModel: async (model: Model) => {
    const previousModel = get().currentModel;
    const {error} = await setModel(model.id);
    if (error) {
      set({error});
      return;
    }
    set({error: null, currentModel: model});
    const isProviderChanged = previousModel?.provider !== model.provider;
    if (isProviderChanged) {
      set({currentSession: null, sessions: []});
      get().getSession();
      get().getSessions();
    }
  },

  getModels: async () => {
    const {data, error} = await fetchModels();
    if (data) set({models: data});
    else if (error) set({error});
  },

  getConfig: async () => {
    const {data, error} = await fetchConfig();
    if (data) set({config: data});
    else if (error) set({error});
  },

  setConfig: async (config: Partial<Config>) => {
    const {error} = await setConfig(config);
    if (error) set({error});
    else await get().getConfig();
  },
});
