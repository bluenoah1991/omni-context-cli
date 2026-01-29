import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as path from 'path';
import * as vscode from 'vscode';
import { z } from 'zod';
import { DiffContentProvider } from '../providers/diffProvider.js';

export function registerTools(mcp: McpServer, diffProvider: DiffContentProvider): void {
  mcp.registerTool('openFile', {
    description: 'Open a file in VS Code',
    inputSchema: {
      filePath: z.string().describe('Absolute path to the file'),
      line: z.number().optional().describe('Line number to jump to (1-based)'),
      column: z.number().optional().describe('Column number (1-based)'),
    },
  }, async ({filePath, line, column}) => {
    const uri = vscode.Uri.file(filePath);
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc, {preview: false});
    const pos = new vscode.Position(Math.max(0, (line || 1) - 1), Math.max(0, (column || 1) - 1));
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
    return {content: [{type: 'text', text: JSON.stringify({success: true, filePath})}]};
  });

  mcp.registerTool('openDiff', {
    description: 'Open a diff view in VS Code comparing old and new content',
    inputSchema: {
      filePath: z.string().describe('Path for the diff title'),
      oldContent: z.string().describe('Original content'),
      newContent: z.string().describe('Modified content'),
    },
  }, async ({filePath, oldContent, newContent}) => {
    const oldUri = vscode.Uri.parse(`omx-diff:${filePath}.old`);
    const newUri = vscode.Uri.parse(`omx-diff:${filePath}.new`);
    diffProvider.set(oldUri, oldContent);
    diffProvider.set(newUri, newContent);
    await vscode.commands.executeCommand(
      'vscode.diff',
      oldUri,
      newUri,
      `${path.basename(filePath)} (Diff)`,
      {preview: false},
    );
    return {content: [{type: 'text', text: JSON.stringify({success: true, filePath})}]};
  });

  mcp.registerTool('getDiagnostics', {
    description: 'Get diagnostics (errors, warnings) from VS Code',
    inputSchema: {uri: z.string().optional().describe('Optional file URI to filter diagnostics')},
  }, async ({uri: filterUri}) => {
    const severityMap = ['Error', 'Warning', 'Information', 'Hint'];
    const diagnostics: object[] = [];
    for (const [uri, diags] of vscode.languages.getDiagnostics()) {
      if (filterUri && uri.toString() !== filterUri) continue;
      for (const d of diags) {
        diagnostics.push({
          uri: uri.fsPath,
          severity: severityMap[d.severity] || 'Unknown',
          message: d.message,
          range: {
            startLine: d.range.start.line + 1,
            startChar: d.range.start.character + 1,
            endLine: d.range.end.line + 1,
            endChar: d.range.end.character + 1,
          },
          ...(d.source && {source: d.source}),
        });
      }
    }
    return {content: [{type: 'text', text: JSON.stringify({diagnostics})}]};
  });

  mcp.registerTool('getOpenEditors', {
    description: 'Get list of currently open editor tabs in VS Code',
    inputSchema: {},
  }, async () => {
    const activeUri = vscode.window.activeTextEditor?.document.uri.toString();
    const editors: object[] = [];
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        if (tab.input instanceof vscode.TabInputText) {
          editors.push({
            filePath: tab.input.uri.fsPath,
            isActive: tab.input.uri.toString() === activeUri,
            isDirty: tab.isDirty,
            viewColumn: group.viewColumn,
          });
        }
      }
    }
    return {content: [{type: 'text', text: JSON.stringify({editors})}]};
  });

  mcp.registerTool('closeAllDiffTabs', {
    description: 'Close all diff editor tabs in VS Code',
    inputSchema: {},
  }, async () => {
    let closedCount = 0;
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        if (tab.input instanceof vscode.TabInputTextDiff) {
          await vscode.window.tabGroups.close(tab);
          closedCount++;
        }
      }
    }
    diffProvider.clear();
    return {content: [{type: 'text', text: JSON.stringify({success: true, closedCount})}]};
  });

  mcp.registerTool('getWorkspaceFolders', {
    description: 'Get VS Code workspace folders',
    inputSchema: {},
  }, async () => {
    const folders =
      vscode.workspace.workspaceFolders?.map(f => ({
        name: f.name,
        uri: f.uri.fsPath,
        index: f.index,
      })) || [];
    return {content: [{type: 'text', text: JSON.stringify({folders})}]};
  });
}
