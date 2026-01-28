import * as vscode from 'vscode';

import { startServer } from './extension';
import { loadTemplate } from './utils';

export class WebviewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = 'omni-context.webview';

  async resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = {enableScripts: true};

    const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!cwd) {
      webviewView.webview.html = loadTemplate('error', {message: 'No workspace folder open'});
      return;
    }

    webviewView.webview.html = loadTemplate('loading');

    try {
      const port = await startServer(cwd);
      webviewView.webview.html = loadTemplate('webview', {port: String(port)});
    } catch (err) {
      webviewView.webview.html = loadTemplate('error', {message: `Failed to start: ${err}`});
    }
  }
}
