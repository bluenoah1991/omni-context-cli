import { app, dialog, ipcMain } from 'electron';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { ApprovalMode } from '../portal/types/config';
import { loadDesktopConfig, loadOmxConfig, saveDesktopConfig, saveOmxConfig } from './config';
import { getStatus, install, uninstall } from './officeAddin';
import { getOmxDir } from './paths';
import { checkPort, getPort, isServerRunning, isTls, startServer, stopServer } from './server';
import { getMainWindow, launchApp } from './window';

export function registerIpcHandlers(): void {
  ipcMain.handle('get-version', () => app.getVersion());
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

  ipcMain.handle(
    'start-serve',
    async (
      _,
      workspace: string,
      approvalMode: string,
      workflow?: string,
      options?: {lanAccess?: boolean; fixedPort?: number | null; language?: string;},
    ) => {
      try {
        const port = await startServer(workspace, approvalMode as ApprovalMode, workflow, options);
        for (let i = 0; i < 300; i++) {
          if (await checkPort(port)) return {success: true, port, tls: isTls()};
          await new Promise(r => setTimeout(r, 100));
        }
        return {success: false, error: 'Server did not start in time'};
      } catch (err: any) {
        return {success: false, error: err?.message || String(err)};
      }
    },
  );

  ipcMain.handle('stop-serve', () => {
    stopServer();
  });

  ipcMain.handle(
    'get-serve-status',
    () => ({running: isServerRunning(), port: getPort(), tls: isTls()}),
  );

  ipcMain.handle('get-custom-prompt', (_, name: string) => {
    const path = join(getOmxDir(), `${name}.txt`);
    if (existsSync(path)) {
      return readFileSync(path, 'utf-8');
    }
    return null;
  });

  ipcMain.handle('save-custom-prompt', (_, name: string, content: string) => {
    const path = join(getOmxDir(), `${name}.txt`);
    writeFileSync(path, content, 'utf-8');
  });

  ipcMain.handle('delete-custom-prompt', (_, name: string) => {
    const path = join(getOmxDir(), `${name}.txt`);
    if (existsSync(path)) {
      unlinkSync(path);
    }
  });

  ipcMain.handle('get-office-status', () => getStatus());
  ipcMain.handle('install-office-addin', () => install());
  ipcMain.handle('uninstall-office-addin', () => uninstall());
}
