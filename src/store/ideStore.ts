import { create } from 'zustand';
import { IDESelection } from '../types/ide';

interface IDEState {
  selection: IDESelection | null;
  connected: boolean;
  ideName: string | null;
  setSelection: (selection: IDESelection | null) => void;
  setConnected: (connected: boolean, ideName?: string) => void;
}

export const useIDEStore = create<IDEState>(set => ({
  selection: null,
  connected: false,
  ideName: null,
  setSelection: selection => set({selection}),
  setConnected: (connected, ideName) => set({connected, ideName: ideName ?? null}),
}));
