import http from 'node:http';

interface PollWaiter {
  resolve: (message: unknown) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

export interface TransportCallbacks {
  handlePoll: (body: any) => string | null;
  onDisconnect?: (clientId: string) => void;
}

export class LongPollTransport {
  private pendingMessages = new Map<string, unknown>();
  private pollWaiters = new Map<string, PollWaiter>();
  private pollTimeoutMs: number;
  private callbacks: TransportCallbacks;

  constructor(callbacks: TransportCallbacks, pollTimeoutMs: number = 30000) {
    this.callbacks = callbacks;
    this.pollTimeoutMs = pollTimeoutMs;
  }

  async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const body = await this.readBody(req);
      const clientId = this.callbacks.handlePoll(body);

      if (!clientId) {
        this.sendError(res, 'Invalid request', 400);
        return;
      }

      this.kickExisting(clientId);

      res.on('close', () => {
        if (res.writableEnded) return;
        this.resolveWaiter(clientId, null);
        this.pendingMessages.delete(clientId);
        this.callbacks.onDisconnect?.(clientId);
      });

      const message = await this.poll(clientId);
      this.sendJson(res, message);
    } catch (error) {
      this.sendError(res, String(error), 500);
    }
  }

  send(clientId: string, message: unknown): void {
    const waiter = this.pollWaiters.get(clientId);
    if (waiter) {
      this.resolveWaiter(clientId, message);
    } else {
      this.pendingMessages.set(clientId, message);
    }
  }

  private kickExisting(clientId: string): void {
    const existing = this.pollWaiters.get(clientId);
    if (existing) {
      clearTimeout(existing.timeoutId);
      this.pollWaiters.delete(clientId);
      existing.resolve({kicked: true});
    }
  }

  private poll(clientId: string): Promise<unknown> {
    const message = this.pendingMessages.get(clientId);
    if (message) {
      this.pendingMessages.delete(clientId);
      return Promise.resolve(message);
    }

    return new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        this.resolveWaiter(clientId, null);
      }, this.pollTimeoutMs);

      this.pollWaiters.set(clientId, {resolve, timeoutId});
    });
  }

  private resolveWaiter(clientId: string, message: unknown): void {
    const waiter = this.pollWaiters.get(clientId);
    if (waiter) {
      clearTimeout(waiter.timeoutId);
      this.pollWaiters.delete(clientId);
      waiter.resolve(message);
    }
  }

  private async readBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => (data += chunk));
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          reject(new Error('Invalid JSON'));
        }
      });
      req.on('error', reject);
    });
  }

  private sendJson(res: http.ServerResponse, data: any): void {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(data));
  }

  private sendError(res: http.ServerResponse, message: string, status: number): void {
    res.writeHead(status, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({error: message}));
  }
}
