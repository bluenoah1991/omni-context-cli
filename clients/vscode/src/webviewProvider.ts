import { readFileSync } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { startServer } from './extension';

function loadTemplate(name: string, vars: Record<string, string> = {}): string {
  let content = readFileSync(path.join(__dirname, '..', 'templates', `${name}.html`), 'utf8');
  for (const [key, value] of Object.entries(vars)) {
    content = content.replace(`{{${key}}}`, value);
  }
  return content;
}

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
