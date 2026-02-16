import { ChildProcess, spawn } from 'child_process';
import * as fs from 'fs';
import * as net from 'net';
import { FileSystemAdapter, Plugin, WorkspaceLeaf } from 'obsidian';
import * as os from 'os';
import * as path from 'path';

import { IdeServer } from './mcp/server';
import { OMNI_CONTEXT_VIEW_TYPE, OmniContextView } from './view';

let serverProcess: ChildProcess | null = null;
let serverPort: number | null = null;
let ideServer: IdeServer | null = null;

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
    return `http://localhost:${serverPort}`;
  }

  onStatus?.('Finding available port...');
  const port = await findFreePort();
  serverPort = port;

  onStatus?.('Launching server process...');
  const execInfo = getExecutableInfo();
  const command = execInfo ? execInfo.node : 'node';
  const args = execInfo
    ? [
      execInfo.script,
      '--serve',
      '--scope=project',
      '--port',
      String(port),
      '--parent-pid',
      String(process.pid),
    ]
    : [
      'omni-context-cli',
      '--serve',
      '--scope=project',
      '--port',
      String(port),
      '--parent-pid',
      String(process.pid),
    ];

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

  return `http://localhost:${port}`;
}

function stopServer(): void {
  serverProcess?.kill();
  serverProcess = null;
  serverPort = null;
}

export default class OmniContextPlugin extends Plugin {
  async onload(): Promise<void> {
    const basePath = (this.app.vault.adapter as FileSystemAdapter).getBasePath();

    ideServer = new IdeServer(this.app, basePath);
    ideServer.start().catch(err => console.error('[OmniContext] IDE server failed to start:', err));

    this.registerView(
      OMNI_CONTEXT_VIEW_TYPE,
      (leaf: WorkspaceLeaf) => new OmniContextView(leaf, basePath),
    );

    this.addRibbonIcon('message-circle', 'OmniContext', () => {
      this.activateView();
    });

    this.addCommand({
      id: 'open-view',
      name: 'Open OmniContext',
      callback: () => this.activateView(),
    });
  }

  onunload(): void {
    stopServer();
    ideServer?.stop();
    ideServer = null;
  }

  private async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(OMNI_CONTEXT_VIEW_TYPE);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({type: OMNI_CONTEXT_VIEW_TYPE, active: true});
      this.app.workspace.revealLeaf(leaf);
    }
  }
}
