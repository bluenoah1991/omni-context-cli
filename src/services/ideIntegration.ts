import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage, JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';
import { useIDEStore } from '../store/ideStore.js';

interface LockFileData {
  pid: number;
  workspaceFolders: string[];
  ideName: string;
  transport: string;
  authToken: string;
}

interface IDEConnection {
  client: Client;
  lockData: LockFileData;
  port: number;
  serverId: string;
}

interface SelectionChangedParams {
  text: string;
  filePath: string;
  selection: {
    start: {line: number; character: number;};
    end: {line: number; character: number;};
    isEmpty: boolean;
  };
}

class IDEWebSocketTransport implements Transport {
  private socket?: WebSocket;
  private url: string;
  private authToken: string;
  private notificationHandler?: (method: string, params: any) => void;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(url: string, authToken: string) {
    this.url = url;
    this.authToken = authToken;
  }

  setNotificationHandler(handler: (method: string, params: any) => void): void {
    this.notificationHandler = handler;
  }

  start(): Promise<void> {
    if (this.socket) {
      throw new Error('IDEWebSocketTransport already started');
    }
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(this.url, ['mcp'], {
        headers: {'x-claude-code-ide-authorization': this.authToken},
      });

      this.socket.onerror = event => {
        const error = new Error(`WebSocket error: ${event.message}`);
        reject(error);
        this.onerror?.(error);
      };

      this.socket.onopen = () => {
        resolve();
      };

      this.socket.onclose = () => {
        this.onclose?.();
      };

      this.socket.onmessage = event => {
        try {
          const data = typeof event.data === 'string' ? event.data : event.data.toString();
          const rawMessage = JSON.parse(data);
          if (rawMessage.method && !rawMessage.id && this.notificationHandler) {
            this.notificationHandler(rawMessage.method, rawMessage.params);
            return;
          }
          const message = JSONRPCMessageSchema.parse(rawMessage);
          this.onmessage?.(message);
        } catch (error) {
          this.onerror?.(error as Error);
        }
      };
    });
  }

  async close(): Promise<void> {
    this.socket?.close();
  }

  send(message: JSONRPCMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }
      this.socket.send(JSON.stringify(message));
      resolve();
    });
  }
}

class IDEIntegrationManager {
  private connection: IDEConnection | null = null;
  private tools: Map<string, {tool: Tool; originalName: string;}> = new Map();
  private connectionTimer: NodeJS.Timeout | null = null;

  private getLockDir(): string {
    const claudeConfigDir = process.env.CLAUDE_CONFIG_DIR;
    if (claudeConfigDir) {
      return path.join(claudeConfigDir, 'ide');
    }
    return path.join(os.homedir(), '.claude', 'ide');
  }

  private readLockFile(lockPath: string): LockFileData | null {
    try {
      const content = fs.readFileSync(lockPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  private normalizePath(p: string): string {
    return path.resolve(p).toLowerCase().replace(/\\/g, '/');
  }

  private isWorkspaceMatch(workspaceFolders: string[]): boolean {
    const cwd = this.normalizePath(process.cwd());
    for (const folder of workspaceFolders) {
      const normalized = this.normalizePath(folder);
      if (cwd === normalized || cwd.startsWith(normalized + '/')) {
        return true;
      }
    }
    return false;
  }

  private discoverMatchingLock(): {port: number; data: LockFileData;} | null {
    const lockDir = this.getLockDir();
    if (!fs.existsSync(lockDir)) {
      return null;
    }

    const files = fs.readdirSync(lockDir);

    for (const file of files) {
      if (!file.endsWith('.lock')) continue;

      const portStr = file.replace('.lock', '');
      const port = parseInt(portStr, 10);
      if (isNaN(port)) continue;

      const lockPath = path.join(lockDir, file);
      const data = this.readLockFile(lockPath);
      if (!data) continue;

      if (!this.isProcessRunning(data.pid)) {
        try {
          fs.unlinkSync(lockPath);
        } catch {}
        continue;
      }

      if (data.transport !== 'ws') continue;

      if (!this.isWorkspaceMatch(data.workspaceFolders)) continue;

      return {port, data};
    }

    return null;
  }

  async initialize(): Promise<void> {
    await this.ensureConnection();
    this.startConnectionTimer();
  }

  private startConnectionTimer(): void {
    if (this.connectionTimer) return;

    this.connectionTimer = setInterval(() => {
      if (!this.connection) {
        this.ensureConnection();
      }
    }, 10000);
  }

  private stopConnectionTimer(): void {
    if (this.connectionTimer) {
      clearInterval(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  private async ensureConnection(): Promise<void> {
    const lock = this.discoverMatchingLock();
    if (lock) {
      await this.connectToIDE(lock.port, lock.data);
    }
  }

  private async connectToIDE(port: number, lockData: LockFileData): Promise<void> {
    try {
      const client = new Client({name: 'omx', version: '1.0.0'}, {capabilities: {}});

      const transport = new IDEWebSocketTransport(`ws://127.0.0.1:${port}`, lockData.authToken);

      transport.setNotificationHandler((method, params) => {
        this.handleNotification(method, params);
      });

      transport.onclose = () => {
        this.connection = null;
        this.tools.clear();
        useIDEStore.getState().setConnected(false);
        useIDEStore.getState().setSelection(null);
      };

      await client.connect(transport);

      const serverId = `ide_${lockData.ideName.toLowerCase().replace(/\s+/g, '_')}`;
      this.connection = {client, lockData, port, serverId};

      useIDEStore.getState().setConnected(true, lockData.ideName);

      await this.loadServerTools();
    } catch {}
  }

  private handleNotification(method: string, params: any): void {
    if (method === 'selection_changed') {
      const p = params as SelectionChangedParams;
      if (p.selection.isEmpty) {
        useIDEStore.getState().setSelection({
          text: '',
          filePath: p.filePath,
          lineStart: 0,
          lineEnd: 0,
        });
      } else {
        useIDEStore.getState().setSelection({
          text: p.text,
          filePath: p.filePath,
          lineStart: p.selection.start.line + 1,
          lineEnd: p.selection.end.line + 1,
        });
      }
    }
  }

  private async loadServerTools(): Promise<void> {
    if (!this.connection) return;
    try {
      const response = await this.connection.client.listTools();
      const tools = response.tools || [];
      for (const tool of tools) {
        this.tools.set(tool.name, {tool, originalName: tool.name});
      }
    } catch {}
  }

  getToolDefinitions(): Array<{name: string; description: string; parameters: any;}> {
    if (!this.connection) return [];
    const result: Array<{name: string; description: string; parameters: any;}> = [];
    const prefix = `mcp_${this.connection.serverId}`;
    for (const [name, {tool}] of this.tools) {
      result.push({
        name: `${prefix}_${name}`,
        description: tool.description || '',
        parameters: {
          properties: (tool.inputSchema as any).properties || {},
          required: (tool.inputSchema as any).required,
        },
      });
    }
    return result;
  }

  isMCPTool(toolName: string): boolean {
    if (!this.connection) return false;
    const prefix = `mcp_${this.connection.serverId}_`;
    if (!toolName.startsWith(prefix)) return false;
    const originalName = toolName.slice(prefix.length);
    return this.tools.has(originalName);
  }

  async executeTool(toolName: string, args: any): Promise<any> {
    if (!this.connection) {
      throw new Error(`IDE not connected`);
    }
    const prefix = `mcp_${this.connection.serverId}_`;
    const originalName = toolName.slice(prefix.length);
    const mapping = this.tools.get(originalName);
    if (!mapping) {
      throw new Error(`IDE tool not found: ${toolName}`);
    }

    return await this.connection.client.callTool({
      name: mapping.originalName,
      arguments: args || {},
    });
  }

  getConnection(): {ideName: string; workspaceFolders: string[]; port: number;} | null {
    if (!this.connection) return null;
    return {
      ideName: this.connection.lockData.ideName,
      workspaceFolders: this.connection.lockData.workspaceFolders,
      port: this.connection.port,
    };
  }

  async shutdown(): Promise<void> {
    this.stopConnectionTimer();

    if (this.connection) {
      try {
        await this.connection.client.close();
      } catch {}
    }
    this.connection = null;
    this.tools.clear();
    useIDEStore.getState().setConnected(false);
    useIDEStore.getState().setSelection(null);
  }
}

export const ideIntegration = new IDEIntegrationManager();
