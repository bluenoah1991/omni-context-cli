import { create } from 'zustand';
import type { IDEContextItem } from '../types/ide';

interface IDEState {
  selection: IDEContextItem | null;
  connected: boolean;
  ideName: string | null;
  setSelection: (selection: IDEContextItem | null) => void;
  setConnected: (connected: boolean, ideName?: string) => void;
}

export const useIDEStore = create<IDEState>(set => ({
  selection: null,
  connected: false,
  ideName: null,
  setSelection: selection => set({selection}),
  setConnected: (connected, ideName) => set({connected, ideName: ideName ?? null}),
}));
