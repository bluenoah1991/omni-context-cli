import { ChildProcess, spawn } from 'child_process';
import { app, BrowserWindow, shell } from 'electron';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import * as net from 'net';
import { homedir, tmpdir } from 'os';
import { join } from 'path';

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

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
const PORT = 5282;

const isDev = () => !app.isPackaged;

const getDefaultWorkspace = () => {
  const workspace = join(homedir(), 'Documents', 'OmniContext');
  if (!existsSync(workspace)) {
    mkdirSync(workspace, {recursive: true});
  }
  return workspace;
};

const getPath = (type: 'cli' | 'cwd' | 'webview' | 'icon') => {
  const paths = {
    cli: isDev()
      ? join(__dirname, '../../../../dist/cli.js')
      : join(process.resourcesPath, 'omni-context-cli', 'cli.js'),
    cwd: isDev() ? join(__dirname, '../../../..') : getDefaultWorkspace(),
    webview: isDev() ? join(__dirname, '../../webview') : join(process.resourcesPath, 'webview'),
    icon: isDev()
      ? join(__dirname, '../../../../assets/cone@256.png')
      : join(process.resourcesPath, 'icon.png'),
  };
  return paths[type];
};

const checkPort = (port: number): Promise<boolean> =>
  new Promise(resolve => {
    const socket = net.createConnection(port, '127.0.0.1');
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });

function startServer(): void {
  serverProcess = spawn(process.execPath, [getPath('cli'), '--serve', `--port=${PORT}`], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {...process.env, ELECTRON_RUN_AS_NODE: '1'},
    cwd: getPath('cwd'),
  });
  serverProcess.stdout?.on('data', d => console.log(d.toString().trim()));
  serverProcess.stderr?.on('data', d => console.error(d.toString().trim()));
  serverProcess.on('exit', code => {
    console.log(`Server exited with code ${code}`);
    serverProcess = null;
  });
}

function stopServer(): void {
  serverProcess?.kill();
  serverProcess = null;
}

function createWebviewHtml(): string {
  const webviewPath = getPath('webview');
  let html = readFileSync(join(webviewPath, 'index.html'), 'utf-8');
  html = html.replaceAll('{{OMNI_CONTEXT_BASE_URI}}', webviewPath.replaceAll('\\', '/'));
  html = html.replaceAll('{{OMNI_CONTEXT_CSP}}', '');
  html = html.replaceAll(
    '{{OMNI_CONTEXT_WEBSESSION_ID}}',
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`,
  );
  html = html.replaceAll('{{OMNI_CONTEXT_SERVER_URL}}', `http://localhost:${PORT}`);
  const tempPath = join(tmpdir(), 'omnicontext-app.html');
  writeFileSync(tempPath, html);
  return tempPath;
}

async function createWindow(): Promise<void> {
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
  if (isDev()) mainWindow.webContents.openDevTools();
}

async function waitAndLoad(): Promise<void> {
  await mainWindow?.loadFile(join(__dirname, '../loading.html'));
  startServer();

  for (let i = 0; i < 300; i++) {
    if (await checkPort(PORT)) {
      await mainWindow?.loadFile(createWebviewHtml());
      return;
    }
    await new Promise(r => setTimeout(r, 100));
  }
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.focus();
  });

  app.whenReady().then(async () => {
    app.setAppUserModelId('com.omni-context.desktop');
    await createWindow();
    await waitAndLoad();
    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow();
        await waitAndLoad();
      }
    });
  });

  app.on('window-all-closed', () => {
    stopServer();
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('before-quit', stopServer);
}
