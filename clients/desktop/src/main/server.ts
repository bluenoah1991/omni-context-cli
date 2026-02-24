import { ChildProcess, spawn } from 'child_process';
import { existsSync } from 'fs';
import * as net from 'net';
import { homedir } from 'os';
import { join } from 'path';
import type { ApprovalMode } from '../portal/types/config';
import { getStatus as getOfficeStatus } from './officeAddin';
import { getPath } from './paths';
import { resolveShellEnv } from './shellEnv';

let serverProcess: ChildProcess | null = null;
let currentPort: number | null = null;
let tlsEnabled = false;

export const getPort = () => currentPort;
export const isTls = () => tlsEnabled;

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

export const checkPort = (port: number): Promise<boolean> =>
  new Promise(resolve => {
    const socket = net.createConnection(port, '127.0.0.1');
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });

export async function startServer(
  cwd: string,
  approvalMode: ApprovalMode,
  workflow?: string,
  options?: {lanAccess?: boolean; fixedPort?: number | null;},
): Promise<number> {
  await resolveShellEnv();
  const port = options?.fixedPort ?? await findFreePort();
  currentPort = port;

  const host = options?.lanAccess ? '0.0.0.0' : '127.0.0.1';

  const args = [
    getPath('cli'),
    '--serve',
    '--scope=project',
    `--port=${port}`,
    `--host=${host}`,
    `--parent-pid=${process.pid}`,
  ];
  if (approvalMode === 'write') args.push('--approve-write');
  if (approvalMode === 'all') args.push('--approve-all');
  if (workflow) args.push(`--workflow=${workflow}`);

  if (getOfficeStatus().installed) {
    const certsDir = join(homedir(), '.office-addin-dev-certs');
    const certPath = join(certsDir, 'localhost.crt');
    const keyPath = join(certsDir, 'localhost.key');
    if (existsSync(certPath) && existsSync(keyPath)) {
      args.push('--tls', `--tls-cert=${certPath}`, `--tls-key=${keyPath}`);
      tlsEnabled = true;
    }
  }

  serverProcess = spawn(process.execPath, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {...process.env, ELECTRON_RUN_AS_NODE: '1'},
    cwd,
  });
  serverProcess.stdout?.on('data', d => console.log(d.toString().trim()));
  serverProcess.stderr?.on('data', d => console.error(d.toString().trim()));
  serverProcess.on('exit', code => {
    console.log(`Server exited with code ${code}`);
    serverProcess = null;
    currentPort = null;
    tlsEnabled = false;
  });

  return port;
}

export function stopServer(): void {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
    currentPort = null;
  }
}

export function isServerRunning(): boolean {
  return serverProcess !== null;
}
