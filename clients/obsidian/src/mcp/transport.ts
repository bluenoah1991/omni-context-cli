import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { WebSocket } from 'ws';

export class WebSocketTransport implements Transport {
  private messageHandler?: (message: JSONRPCMessage) => void;
  private closeHandler?: () => void;
  private errorHandler?: (error: Error) => void;

  constructor(private ws: WebSocket) {
    ws.on('message', data => {
      try {
        const message = JSON.parse(data.toString()) as JSONRPCMessage;
        this.messageHandler?.(message);
      } catch {}
    });
    ws.on('close', () => this.closeHandler?.());
    ws.on('error', err => this.errorHandler?.(err));
  }

  async start(): Promise<void> {}

  async close(): Promise<void> {
    this.ws.close();
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  set onmessage(handler: (message: JSONRPCMessage) => void) {
    this.messageHandler = handler;
  }

  set onclose(handler: () => void) {
    this.closeHandler = handler;
  }

  set onerror(handler: (error: Error) => void) {
    this.errorHandler = handler;
  }
}
