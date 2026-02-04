import * as vscode from 'vscode';

import { startServer } from './extension';
import { buildWebviewHtml, loadTemplate } from './utils';

export class WebviewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = 'omni-context.webview';

  private extensionUri: vscode.Uri;
  private webviewView?: vscode.WebviewView;
  private themeDisposable?: vscode.Disposable;

  constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;
  }

  async resolveWebviewView(webviewView: vscode.WebviewView) {
    this.webviewView = webviewView;
    const webviewUri = vscode.Uri.joinPath(this.extensionUri, 'webview');
    webviewView.webview.options = {enableScripts: true, localResourceRoots: [webviewUri]};
    webviewView.webview.html = loadTemplate('loading', {status: 'Waiting for workspace...'});

    this.themeDisposable?.dispose();
    this.themeDisposable = vscode.window.onDidChangeActiveColorTheme(theme => {
      this.webviewView?.webview.postMessage({
        type: 'themeChange',
        theme: theme.kind === vscode.ColorThemeKind.Light ? 'light' : 'dark',
      });
    });

    webviewView.onDidDispose(() => {
      this.themeDisposable?.dispose();
      this.webviewView = undefined;
    });

    const cwd = await this.waitForWorkspace();
    if (!cwd) {
      webviewView.webview.html = loadTemplate('error', {message: 'No workspace folder open'});
      return;
    }

    webviewView.webview.html = loadTemplate('loading', {status: 'Starting server...'});

    try {
      const serverUrl = await startServer(cwd, status => {
        webviewView.webview.html = loadTemplate('loading', {status});
      });
      webviewView.webview.html = buildWebviewHtml(
        webviewView.webview,
        this.extensionUri,
        serverUrl,
      );
    } catch (err) {
      webviewView.webview.html = loadTemplate('error', {message: `Failed to start: ${err}`});
    }
  }

  private async waitForWorkspace(timeout = 60000): Promise<string | undefined> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (cwd) return cwd;
      await new Promise(r => setTimeout(r, 200));
    }
    return undefined;
  }
}
