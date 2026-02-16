import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as http from 'http';
import { App } from 'obsidian';
import { WebSocket, WebSocketServer } from 'ws';
import { LockFileManager } from './lockFile';
import { SelectionBroadcaster } from './selection';
import { registerTools } from './tools';
import { WebSocketTransport } from './transport';

export class IdeServer {
  private wss: WebSocketServer | null = null;
  private httpServer: http.Server | null = null;
  private authToken: string;
  private clients: Set<WebSocket> = new Set();
  private lockFileManager: LockFileManager;
  private selectionBroadcaster: SelectionBroadcaster;
  private vaultPath: string;

  constructor(private app: App, vaultPath: string) {
    this.authToken = this.generateToken();
    this.vaultPath = vaultPath;
    this.lockFileManager = new LockFileManager();
    this.selectionBroadcaster = new SelectionBroadcaster(app, () => this.clients, vaultPath);
  }

  private generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private createMcpServer(): McpServer {
    const mcp = new McpServer({name: 'omni-context-obsidian-plugin', version: '1.0.0'});
    registerTools(mcp, this.app, this.vaultPath);
    return mcp;
  }

  async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer();
      this.wss = new WebSocketServer({noServer: true});

      this.httpServer.on('upgrade', (req, socket, head) => {
        if (req.headers['x-omni-context-ide-authorization'] !== this.authToken) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }
        this.wss!.handleUpgrade(req, socket, head, ws => {
          this.wss!.emit('connection', ws);
        });
      });

      this.wss.on('connection', ws => {
        this.clients.add(ws);
        const transport = new WebSocketTransport(ws);
        const mcp = this.createMcpServer();
        mcp.connect(transport);
        ws.on('close', () => this.clients.delete(ws));
      });

      this.httpServer.listen(0, '127.0.0.1', () => {
        const addr = this.httpServer!.address();
        if (typeof addr === 'object' && addr) {
          const port = addr.port;
          this.lockFileManager.write(port, this.authToken, this.vaultPath);
          this.selectionBroadcaster.start();
          resolve(port);
        }
      });

      this.httpServer.on('error', reject);
    });
  }

  stop(): void {
    this.selectionBroadcaster.stop();
    this.lockFileManager.remove();
    for (const client of this.clients) client.close();
    this.clients.clear();
    this.wss?.close();
    this.httpServer?.close();
  }
}
