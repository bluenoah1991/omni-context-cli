import { readFileSync } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function loadTemplate(name: string, vars: Record<string, string> = {}): string {
  let content = readFileSync(path.join(__dirname, '..', 'templates', `${name}.html`), 'utf8');
  for (const [key, value] of Object.entries(vars)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }
  return content;
}

function generateSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export function buildWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  serverUrl: string,
): string {
  const webviewPath = path.join(extensionUri.fsPath, 'webview');
  const baseUri = webview.asWebviewUri(vscode.Uri.file(webviewPath));
  const cspSource = webview.cspSource;
  const serverOrigin = new URL(serverUrl).origin;
  const csp = [
    `default-src 'none'`,
    `style-src ${cspSource} 'unsafe-inline'`,
    `font-src ${cspSource} data:`,
    `img-src ${cspSource} data:`,
    `script-src ${cspSource}`,
    `connect-src ${serverOrigin}`,
  ].join('; ');

  let html = readFileSync(path.join(webviewPath, 'index.html'), 'utf-8');
  html = html.replaceAll('{{OMNI_CONTEXT_BASE_URI}}', baseUri.toString());
  html = html.replaceAll('{{OMNI_CONTEXT_CSP}}', csp);
  html = html.replaceAll('{{OMNI_CONTEXT_WEBSESSION_ID}}', generateSessionId());
  html = html.replaceAll('{{OMNI_CONTEXT_SERVER_URL}}', serverUrl);
  return html;
}
