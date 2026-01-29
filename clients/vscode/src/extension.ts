import { ChildProcess, spawn } from 'child_process';
import * as fs from 'fs';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { loadTemplate } from './utils';
import { WebviewProvider } from './webviewProvider';

let serverProcess: ChildProcess | null = null;
let serverPort: number | null = null;

function getExecutableInfo(): {node: string; script: string;} | null {
  const execFile = path.join(os.homedir(), '.omx', 'executable');
  if (fs.existsSync(execFile)) {
    try {
      return JSON.parse(fs.readFileSync(execFile, 'utf-8'));
    } catch {
      return null;
    }
  }
  return null;
}

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const {port} = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

async function waitForPort(port: number, timeout = 60000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const ok = await new Promise<boolean>(resolve => {
      const socket = net.createConnection(port, '127.0.0.1');
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('error', () => resolve(false));
    });
    if (ok) return true;
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

export async function startServer(
  cwd: string,
  onStatus?: (status: string) => void,
): Promise<string> {
  if (serverProcess && serverPort) {
    const externalUri = await vscode.env.asExternalUri(
      vscode.Uri.parse(`http://localhost:${serverPort}`),
    );
    return externalUri.toString();
  }

  onStatus?.('Finding available port...');
  const port = await findFreePort();
  serverPort = port;

  onStatus?.('Launching server process...');
  const execInfo = getExecutableInfo();
  const command = execInfo ? execInfo.node : 'node';
  const args = execInfo
    ? [execInfo.script, '--serve', '--port', String(port), '--parent-pid', String(process.pid)]
    : ['omni-context-cli', '--serve', '--port', String(port), '--parent-pid', String(process.pid)];

  let stderrOutput = '';
  serverProcess = spawn(command, args, {
    cwd,
    stdio: ['ignore', 'ignore', 'pipe'],
    shell: !execInfo,
    windowsHide: true,
  });

  serverProcess.stderr?.on('data', (data: Buffer) => {
    stderrOutput += data.toString();
  });

  serverProcess.on('exit', code => {
    if (code !== 0 && stderrOutput) {
      console.error('[OmniContext] Server stderr:', stderrOutput);
    }
    serverProcess = null;
    serverPort = null;
  });

  onStatus?.('Waiting for server to be ready...');
  const ready = await waitForPort(port);
  if (!ready) {
    const errMsg = stderrOutput
      ? `Server error: ${stderrOutput.slice(0, 200)}`
      : 'Server failed to start';
    throw new Error(errMsg);
  }

  const externalUri = await vscode.env.asExternalUri(vscode.Uri.parse(`http://localhost:${port}`));
  return externalUri.toString();
}

function stopServer() {
  serverProcess?.kill();
  serverProcess = null;
  serverPort = null;
}

async function openInEditor() {
  const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!cwd) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    'omni-context.editor',
    'OmniContext',
    vscode.ViewColumn.One,
    {enableScripts: true, retainContextWhenHidden: true},
  );

  panel.webview.html = loadTemplate('loading', {status: 'Starting server...'});

  try {
    const serverUrl = await startServer(cwd, status => {
      panel.webview.html = loadTemplate('loading', {status});
    });
    panel.webview.html = loadTemplate('webview', {serverUrl});
  } catch (err) {
    panel.webview.html = loadTemplate('error', {message: `Failed to start: ${err}`});
  }
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(WebviewProvider.viewType, new WebviewProvider(), {
      webviewOptions: {retainContextWhenHidden: true},
    }),
    vscode.commands.registerCommand('omni-context.openInEditor', openInEditor),
    {dispose: stopServer},
  );
}

export function deactivate() {
  stopServer();
}
