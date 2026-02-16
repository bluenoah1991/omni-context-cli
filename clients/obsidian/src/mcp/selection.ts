import { App, EventRef, MarkdownView } from 'obsidian';
import * as path from 'path';
import { WebSocket } from 'ws';

export class SelectionBroadcaster {
  private eventRef: EventRef | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private app: App,
    private getClients: () => Set<WebSocket>,
    private vaultPath: string,
  ) {}

  start(): void {
    this.eventRef = this.app.workspace.on('active-leaf-change', () => {
      this.broadcast();
    });
    this.timer = setInterval(() => {
      this.broadcast();
    }, 2000);
  }

  stop(): void {
    if (this.eventRef) {
      this.app.workspace.offref(this.eventRef);
      this.eventRef = null;
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private broadcast(): void {
    const clients = this.getClients();
    if (clients.size === 0) return;

    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view?.file) return;

    const editor = view.editor;
    const from = editor.getCursor('from');
    const to = editor.getCursor('to');
    const text = editor.getSelection();

    const filePath = this.vaultPath ? path.join(this.vaultPath, view.file.path) : view.file.path;

    const notification = JSON.stringify({
      jsonrpc: '2.0',
      method: 'selection_changed',
      params: {
        text,
        filePath,
        selection: {
          start: {line: from.line, character: from.ch},
          end: {line: to.line, character: to.ch},
          isEmpty: !text,
        },
      },
    });

    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(notification);
      }
    }
  }
}
