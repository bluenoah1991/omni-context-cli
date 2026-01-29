import * as vscode from 'vscode';

import { startServer } from './extension';
import { loadTemplate } from './utils';

export class WebviewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = 'omni-context.webview';

  async resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = {enableScripts: true};
    webviewView.webview.html = loadTemplate('loading', {status: 'Waiting for workspace...'});

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
      webviewView.webview.html = loadTemplate('webview', {serverUrl});
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
