import { ChildProcess, spawn } from 'child_process';
import * as net from 'net';
import * as vscode from 'vscode';

import { loadTemplate } from './utils';
import { WebviewProvider } from './webviewProvider';

let serverProcess: ChildProcess | null = null;
let serverPort: number | null = null;

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

export async function startServer(cwd: string): Promise<number> {
  if (serverProcess) return serverPort!;

  const port = await findFreePort();
  serverPort = port;

  serverProcess = spawn('omni-context-cli', [
    '--serve',
    '--port',
    String(port),
    '--parent-pid',
    String(process.pid),
  ], {cwd, stdio: 'ignore', shell: true, windowsHide: true});

  serverProcess.on('exit', () => {
    serverProcess = null;
    serverPort = null;
  });

  await new Promise(r => setTimeout(r, 1500));
  return port;
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

  panel.webview.html = loadTemplate('loading');

  try {
    const port = await startServer(cwd);
    panel.webview.html = loadTemplate('webview', {port: String(port)});
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
