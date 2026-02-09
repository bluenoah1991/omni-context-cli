import { app, BrowserWindow, nativeTheme } from 'electron';
import { appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { registerIpcHandlers } from './ipc';
import { getStatus, startServer as startOfficeServer } from './officeAddin';
import { checkPort, getPort } from './server';
import { createWindow, resumeApp, showPortal } from './window';

if (app.isPackaged) {
  const logPath = join(app.getPath('userData'), 'main.log');
  const writeLog = (level: string, args: unknown[]) => {
    const message = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
    try {
      mkdirSync(app.getPath('userData'), {recursive: true});
      appendFileSync(logPath, line);
    } catch {}
  };
  console.log = (...args) => writeLog('info', args);
  console.error = (...args) => writeLog('error', args);
}

registerIpcHandlers();

app.whenReady().then(async () => {
  app.setAppUserModelId('com.omni-context.desktop');
  nativeTheme.themeSource = 'system';
  await createWindow();
  await showPortal();
  if (getStatus().installed) {
    startOfficeServer().catch(e => console.error('Office server failed:', e));
  }
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
      const port = getPort();
      if (port && (await checkPort(port))) {
        await resumeApp(port);
      } else {
        await showPortal();
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
