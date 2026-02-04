import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getOmxConfig: () => ipcRenderer.invoke('get-omx-config'),
  saveOmxConfig: (config: unknown) => ipcRenderer.invoke('save-omx-config', config),
  getDesktopConfig: () => ipcRenderer.invoke('get-desktop-config'),
  saveDesktopConfig: (config: unknown) => ipcRenderer.invoke('save-desktop-config', config),
  checkPathExists: (path: string) => ipcRenderer.invoke('check-path-exists', path),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  launch: (workspace: string, approvalMode: string) =>
    ipcRenderer.send('launch', workspace, approvalMode),
  getCustomPrompt: (name: string) => ipcRenderer.invoke('get-custom-prompt', name),
  saveCustomPrompt: (name: string, content: string) =>
    ipcRenderer.invoke('save-custom-prompt', name, content),
  deleteCustomPrompt: (name: string) => ipcRenderer.invoke('delete-custom-prompt', name),
});
