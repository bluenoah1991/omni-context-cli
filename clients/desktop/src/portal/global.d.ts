import type { ApprovalMode, DesktopConfig, OmxConfig } from './types/config';

declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>;
      getOmxConfig: () => Promise<OmxConfig>;
      saveOmxConfig: (config: OmxConfig) => Promise<void>;
      getDesktopConfig: () => Promise<DesktopConfig>;
      saveDesktopConfig: (config: DesktopConfig) => Promise<void>;
      checkPathExists: (path: string) => Promise<boolean>;
      selectFolder: () => Promise<string | null>;
      launch: (workspace: string, approvalMode: ApprovalMode) => void;
      startServe: (
        workspace: string,
        approvalMode: string,
        workflow?: string,
      ) => Promise<{success: boolean; port?: number; tls?: boolean; error?: string;}>;
      stopServe: () => Promise<void>;
      getServeStatus: () => Promise<{running: boolean; port: number | null; tls: boolean;}>;
      getCustomPrompt: (name: string) => Promise<string | null>;
      saveCustomPrompt: (name: string, content: string) => Promise<void>;
      deleteCustomPrompt: (name: string) => Promise<void>;
      getOfficeStatus: () => Promise<{installed: boolean; running: boolean; port: number;}>;
      installOfficeAddin: () => Promise<{success: boolean; error?: string;}>;
      uninstallOfficeAddin: () => Promise<{success: boolean; error?: string;}>;
    };
  }
}
