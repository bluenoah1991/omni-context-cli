import { BrowserWindow, shell } from 'electron';
import { readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { ApprovalMode } from '../portal/types/config';
import { getPath, isDev } from './paths';
import { checkPort, isTls, startServer } from './server';

let mainWindow: BrowserWindow | null = null;

export const getMainWindow = () => mainWindow;

function createWebviewHtml(port: number): string {
  const webviewPath = getPath('webview');
  let html = readFileSync(join(webviewPath, 'index.html'), 'utf-8');
  html = html.replaceAll('{{OMNI_CONTEXT_BASE_URI}}', webviewPath.replaceAll('\\', '/'));
  html = html.replaceAll('{{OMNI_CONTEXT_CSP}}', '');
  html = html.replaceAll(
    '{{OMNI_CONTEXT_WEBSESSION_ID}}',
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`,
  );
  const protocol = isTls() ? 'https' : 'http';
  html = html.replaceAll('{{OMNI_CONTEXT_SERVER_URL}}', `${protocol}://localhost:${port}`);
  const tempPath = join(tmpdir(), 'omnicontext-app.html');
  writeFileSync(tempPath, html);
  return tempPath;
}

export async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'OmniContext Desktop',
    icon: getPath('icon'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });
  mainWindow.on('ready-to-show', () => mainWindow?.show());
  mainWindow.on('page-title-updated', e => e.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(details => {
    shell.openExternal(details.url);
    return {action: 'deny'};
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
        event.preventDefault();
        shell.openExternal(url);
      }
    }
  });
  if (isDev()) mainWindow.webContents.openDevTools();
}

export async function showPortal(): Promise<void> {
  await mainWindow?.loadFile(join(getPath('portal'), 'index.html'));
}

export async function launchApp(cwd: string, approvalMode: ApprovalMode): Promise<void> {
  await mainWindow?.loadFile(join(__dirname, '../loading.html'));
  const port = await startServer(cwd, approvalMode);

  for (let i = 0; i < 300; i++) {
    if (await checkPort(port)) {
      await mainWindow?.loadFile(createWebviewHtml(port));
      return;
    }
    await new Promise(r => setTimeout(r, 100));
  }
}

export async function resumeApp(port: number): Promise<void> {
  await mainWindow?.loadFile(createWebviewHtml(port));
}
