import { dialog, ipcMain } from 'electron';
import { existsSync } from 'fs';
import type { ApprovalMode } from '../portal/types/config';
import { loadDesktopConfig, loadOmxConfig, saveDesktopConfig, saveOmxConfig } from './config';
import { getMainWindow, launchApp } from './window';

export function registerIpcHandlers(): void {
  ipcMain.handle('get-omx-config', () => loadOmxConfig());
  ipcMain.handle('save-omx-config', (_, config) => saveOmxConfig(config));
  ipcMain.handle('get-desktop-config', () => loadDesktopConfig());
  ipcMain.handle('save-desktop-config', (_, config) => saveDesktopConfig(config));
  ipcMain.handle('check-path-exists', (_, path: string) => existsSync(path));

  ipcMain.handle('select-folder', async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {properties: ['openDirectory']});
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.on('launch', (_, workspace: string, approvalMode: ApprovalMode) => {
    launchApp(workspace, approvalMode);
  });
}
