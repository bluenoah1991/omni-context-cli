import type { ApprovalMode, DesktopConfig, OmxConfig } from './types/config';

declare global {
  interface Window {
    electronAPI: {
      getOmxConfig: () => Promise<OmxConfig>;
      saveOmxConfig: (config: OmxConfig) => Promise<void>;
      getDesktopConfig: () => Promise<DesktopConfig>;
      saveDesktopConfig: (config: DesktopConfig) => Promise<void>;
      checkPathExists: (path: string) => Promise<boolean>;
      selectFolder: () => Promise<string | null>;
      launch: (workspace: string, approvalMode: ApprovalMode) => void;
      getCustomPrompt: (name: string) => Promise<string | null>;
      saveCustomPrompt: (name: string, content: string) => Promise<void>;
      deleteCustomPrompt: (name: string) => Promise<void>;
    };
  }
}
