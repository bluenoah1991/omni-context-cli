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

    let filePath: string;
    let text = '';
    let from = {line: 0, ch: 0};
    let to = {line: 0, ch: 0};

    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view?.file) {
      const editor = view.editor;
      from = editor.getCursor('from');
      to = editor.getCursor('to');
      text = editor.getSelection();
      filePath = this.vaultPath ? path.join(this.vaultPath, view.file.path) : view.file.path;
    } else {
      const activeFile = this.app.workspace.getActiveFile();
      if (!activeFile) return;
      filePath = this.vaultPath ? path.join(this.vaultPath, activeFile.path) : activeFile.path;
    }

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
