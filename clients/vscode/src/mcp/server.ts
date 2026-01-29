import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { DiffContentProvider } from '../providers/diffProvider.js';
import { LockFileManager } from './lockFile.js';
import { SelectionBroadcaster } from './selection.js';
import { registerTools } from './tools.js';
import { WebSocketTransport } from './transport.js';

export class IdeServer {
  private wss: WebSocketServer | null = null;
  private httpServer: http.Server | null = null;
  private authToken: string;
  private clients: Set<WebSocket> = new Set();
  private diffProvider: DiffContentProvider;
  private lockFileManager: LockFileManager;
  private selectionBroadcaster: SelectionBroadcaster;

  constructor() {
    this.authToken = this.generateToken();
    this.diffProvider = new DiffContentProvider();
    this.lockFileManager = new LockFileManager();
    this.selectionBroadcaster = new SelectionBroadcaster(() => this.clients);
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
    const mcp = new McpServer({name: 'omni-context-vscode-extension', version: '1.0.0'});
    registerTools(mcp, this.diffProvider);
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
          this.lockFileManager.write(port, this.authToken);
          this.selectionBroadcaster.start();
          resolve(port);
        }
      });

      this.httpServer.on('error', reject);
    });
  }

  stop(): void {
    this.selectionBroadcaster.stop();
    this.diffProvider.dispose();
    this.lockFileManager.remove();
    for (const client of this.clients) client.close();
    this.clients.clear();
    this.wss?.close();
    this.httpServer?.close();
  }
}
