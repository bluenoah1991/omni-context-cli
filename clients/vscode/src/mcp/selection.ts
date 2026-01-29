import * as vscode from 'vscode';
import { WebSocket } from 'ws';

export class SelectionBroadcaster {
  private disposable: vscode.Disposable | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(private getClients: () => Set<WebSocket>) {}

  start(): void {
    this.disposable = vscode.window.onDidChangeTextEditorSelection(() => {
      this.broadcast();
    });
    this.timer = setInterval(() => {
      this.broadcast();
    }, 2000);
  }

  stop(): void {
    this.disposable?.dispose();
    this.disposable = null;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private broadcast(): void {
    const editor = vscode.window.activeTextEditor;
    const clients = this.getClients();
    if (!editor || clients.size === 0) return;

    const selection = editor.selection;
    const notification = JSON.stringify({
      jsonrpc: '2.0',
      method: 'selection_changed',
      params: {
        text: editor.document.getText(selection),
        filePath: editor.document.uri.fsPath,
        selection: {
          start: {line: selection.start.line, character: selection.start.character},
          end: {line: selection.end.line, character: selection.end.character},
          isEmpty: selection.isEmpty,
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
