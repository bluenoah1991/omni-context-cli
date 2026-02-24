import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-version'),
  getOmxConfig: () => ipcRenderer.invoke('get-omx-config'),
  saveOmxConfig: (config: unknown) => ipcRenderer.invoke('save-omx-config', config),
  getDesktopConfig: () => ipcRenderer.invoke('get-desktop-config'),
  saveDesktopConfig: (config: unknown) => ipcRenderer.invoke('save-desktop-config', config),
  checkPathExists: (path: string) => ipcRenderer.invoke('check-path-exists', path),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  launch: (workspace: string, approvalMode: string) =>
    ipcRenderer.send('launch', workspace, approvalMode),
  startServe: (
    workspace: string,
    approvalMode: string,
    workflow?: string,
    options?: {lanAccess?: boolean; fixedPort?: number | null;},
  ) => ipcRenderer.invoke('start-serve', workspace, approvalMode, workflow, options),
  stopServe: () => ipcRenderer.invoke('stop-serve'),
  getServeStatus: () =>
    ipcRenderer.invoke('get-serve-status') as Promise<
      {running: boolean; port: number | null; tls: boolean;}
    >,
  getCustomPrompt: (name: string) => ipcRenderer.invoke('get-custom-prompt', name),
  saveCustomPrompt: (name: string, content: string) =>
    ipcRenderer.invoke('save-custom-prompt', name, content),
  deleteCustomPrompt: (name: string) => ipcRenderer.invoke('delete-custom-prompt', name),
  getOfficeStatus: () => ipcRenderer.invoke('get-office-status'),
  installOfficeAddin: () => ipcRenderer.invoke('install-office-addin'),
  uninstallOfficeAddin: () => ipcRenderer.invoke('uninstall-office-addin'),
});
