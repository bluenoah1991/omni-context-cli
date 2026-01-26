import { create } from 'zustand';
import { type ChatSlice, createChatSlice } from './slices/chatSlice';
import { type ConfigSlice, createConfigSlice } from './slices/configSlice';
import { createSessionSlice, type SessionSlice } from './slices/sessionSlice';
import { createUISlice, type UISlice } from './slices/uiSlice';

export type ChatState = ConfigSlice & SessionSlice & ChatSlice & UISlice;

export const useChatStore = create<ChatState>()((...args) => ({
  ...createConfigSlice(...args),
  ...createSessionSlice(...args),
  ...createChatSlice(...args),
  ...createUISlice(...args),
}));
