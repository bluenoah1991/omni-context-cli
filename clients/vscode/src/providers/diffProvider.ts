import * as vscode from 'vscode';

export class DiffContentProvider implements vscode.TextDocumentContentProvider {
  private contents: Map<string, string> = new Map();
  private disposable: vscode.Disposable;

  constructor() {
    this.disposable = vscode.workspace.registerTextDocumentContentProvider('omx-diff', this);
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.contents.get(uri.toString()) || '';
  }

  set(uri: vscode.Uri, content: string): void {
    this.contents.set(uri.toString(), content);
  }

  clear(): void {
    this.contents.clear();
  }

  dispose(): void {
    this.disposable.dispose();
    this.contents.clear();
  }
}
