import { ChildProcess, spawn } from 'child_process';
import * as net from 'net';
import type { ApprovalMode } from '../portal/types/config';
import { getPath } from './paths';

let serverProcess: ChildProcess | null = null;
let currentPort: number | null = null;

export const getPort = () => currentPort;

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
): Promise<number> {
  const port = await findFreePort();
  currentPort = port;

  const args = [
    getPath('cli'),
    '--serve',
    '--scope=project',
    `--port=${port}`,
    `--parent-pid=${process.pid}`,
  ];
  if (approvalMode === 'write') args.push('--approve-write');
  if (approvalMode === 'all') args.push('--approve-all');
  if (workflow) args.push(`--workflow=${workflow}`);

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
