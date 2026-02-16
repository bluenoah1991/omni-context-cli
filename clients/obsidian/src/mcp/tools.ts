import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { App, getAllTags, MarkdownView, TFile, TFolder } from 'obsidian';
import * as path from 'path';
import { z } from 'zod';

function textResult(data: unknown) {
  return {content: [{type: 'text' as const, text: JSON.stringify(data)}]};
}

export function registerTools(mcp: McpServer, app: App, basePath: string): void {
  const toAbsPath = (vaultPath: string): string => {
    return basePath ? path.join(basePath, vaultPath) : vaultPath;
  };

  const toVaultPath = (filePath: string): string => {
    if (!path.isAbsolute(filePath)) return filePath;
    return basePath ? path.relative(basePath, filePath) : filePath;
  };

  const resolveFile = (filePath: string): TFile | null => {
    const file = app.vault.getAbstractFileByPath(toVaultPath(filePath));
    return file instanceof TFile ? file : null;
  };

  mcp.registerTool('openNote', {
    description: 'Open a note in the Obsidian editor',
    inputSchema: {
      filePath: z.string().describe('Path to the note (absolute or vault-relative)'),
      line: z.number().optional().describe('Line number to scroll to (1-based)'),
      newLeaf: z.boolean().optional().describe('Open in a new tab'),
    },
  }, async ({filePath, line, newLeaf}) => {
    const file = resolveFile(filePath);
    if (!file) return textResult({success: false, error: 'File not found in vault'});
    const leaf = app.workspace.getLeaf(newLeaf ?? false);
    await leaf.openFile(file);
    if (line) {
      const view = app.workspace.getActiveViewOfType(MarkdownView);
      if (view) {
        const pos = {line: Math.max(0, line - 1), ch: 0};
        view.editor.setCursor(pos);
        view.editor.scrollIntoView({from: pos, to: pos}, true);
      }
    }
    return textResult({success: true, filePath: toAbsPath(file.path)});
  });

  mcp.registerTool('getActiveNote', {
    description: 'Get the currently active note and cursor position',
    inputSchema: {},
  }, async () => {
    const file = app.workspace.getActiveFile();
    if (!file) return textResult({active: false});
    const result: Record<string, unknown> = {
      active: true,
      filePath: toAbsPath(file.path),
      vaultPath: file.path,
      name: file.basename,
      extension: file.extension,
    };
    const view = app.workspace.getActiveViewOfType(MarkdownView);
    if (view) {
      const cursor = view.editor.getCursor();
      result.cursor = {line: cursor.line + 1, ch: cursor.ch + 1};
      const selection = view.editor.getSelection();
      if (selection) result.selectedText = selection;
    }
    return textResult(result);
  });

  mcp.registerTool('getOpenNotes', {
    description: 'Get all notes currently open in Obsidian tabs',
    inputSchema: {},
  }, async () => {
    const activeFile = app.workspace.getActiveFile();
    const notes: object[] = [];
    const seen = new Set<string>();
    app.workspace.iterateAllLeaves(leaf => {
      const file = (leaf.view as any)?.file;
      if (file instanceof TFile && !seen.has(file.path)) {
        seen.add(file.path);
        notes.push({
          filePath: toAbsPath(file.path),
          vaultPath: file.path,
          name: file.basename,
          isActive: file.path === activeFile?.path,
        });
      }
    });
    return textResult({notes});
  });

  mcp.registerTool('readNote', {
    description: 'Read the content of a note from the vault',
    inputSchema: {filePath: z.string().describe('Path to the note (absolute or vault-relative)')},
  }, async ({filePath}) => {
    const file = resolveFile(filePath);
    if (!file) return textResult({success: false, error: 'File not found'});
    const content = await app.vault.cachedRead(file);
    return textResult({success: true, filePath: toAbsPath(file.path), content});
  });

  mcp.registerTool('createNote', {
    description: 'Create a new note in the vault',
    inputSchema: {
      filePath: z.string().describe(
        'Vault-relative path for the new note (e.g. "folder/My Note.md")',
      ),
      content: z.string().optional().describe('Initial content of the note'),
      open: z.boolean().optional().describe('Open the note after creating it'),
    },
  }, async ({filePath, content, open}) => {
    const vaultPath = toVaultPath(filePath);
    const existing = app.vault.getAbstractFileByPath(vaultPath);
    if (existing) return textResult({success: false, error: 'File already exists'});
    const file = await app.vault.create(vaultPath, content || '');
    if (open) {
      const leaf = app.workspace.getLeaf(false);
      await leaf.openFile(file);
    }
    return textResult({success: true, filePath: toAbsPath(file.path)});
  });

  mcp.registerTool('modifyNote', {
    description: 'Replace the entire content of an existing note',
    inputSchema: {
      filePath: z.string().describe('Path to the note (absolute or vault-relative)'),
      content: z.string().describe('New content for the note'),
    },
  }, async ({filePath, content}) => {
    const file = resolveFile(filePath);
    if (!file) return textResult({success: false, error: 'File not found'});
    await app.vault.modify(file, content);
    return textResult({success: true, filePath: toAbsPath(file.path)});
  });

  mcp.registerTool('appendNote', {
    description: 'Append content to the end of an existing note',
    inputSchema: {
      filePath: z.string().describe('Path to the note (absolute or vault-relative)'),
      content: z.string().describe('Content to append'),
    },
  }, async ({filePath, content}) => {
    const file = resolveFile(filePath);
    if (!file) return textResult({success: false, error: 'File not found'});
    await app.vault.append(file, content);
    return textResult({success: true, filePath: toAbsPath(file.path)});
  });

  mcp.registerTool('renameNote', {
    description:
      'Rename or move a note within the vault. Obsidian automatically updates all internal links pointing to it.',
    inputSchema: {
      filePath: z.string().describe('Current path (absolute or vault-relative)'),
      newPath: z.string().describe('New vault-relative path (e.g. "folder/New Name.md")'),
    },
  }, async ({filePath, newPath}) => {
    const file = resolveFile(filePath);
    if (!file) return textResult({success: false, error: 'File not found'});
    await app.vault.rename(file, toVaultPath(newPath));
    return textResult({success: true, oldPath: filePath, newPath: toAbsPath(file.path)});
  });

  mcp.registerTool('deleteNote', {
    description: 'Move a note to the system trash',
    inputSchema: {filePath: z.string().describe('Path to the note (absolute or vault-relative)')},
  }, async ({filePath}) => {
    const file = resolveFile(filePath);
    if (!file) return textResult({success: false, error: 'File not found'});
    const absPath = toAbsPath(file.path);
    await app.vault.trash(file, true);
    return textResult({success: true, filePath: absPath});
  });

  mcp.registerTool('getNoteMetadata', {
    description:
      'Get parsed metadata for a note: frontmatter properties, headings, internal links, tags, and embeds',
    inputSchema: {filePath: z.string().describe('Path to the note (absolute or vault-relative)')},
  }, async ({filePath}) => {
    const file = resolveFile(filePath);
    if (!file) return textResult({success: false, error: 'File not found'});
    const cache = app.metadataCache.getFileCache(file);
    if (!cache) return textResult({success: true, filePath: toAbsPath(file.path), metadata: null});
    const metadata: Record<string, unknown> = {};
    if (cache.frontmatter) {
      metadata.frontmatter = cache.frontmatter;
    }
    if (cache.headings) {
      metadata.headings = cache.headings.map(h => ({
        level: h.level,
        heading: h.heading,
        line: h.position.start.line + 1,
      }));
    }
    if (cache.links) {
      metadata.links = cache.links.map(l => ({
        displayText: l.displayText,
        link: l.link,
        original: l.original,
        line: l.position.start.line + 1,
      }));
    }
    if (cache.tags) {
      metadata.tags = cache.tags.map(t => ({tag: t.tag, line: t.position.start.line + 1}));
    }
    if (cache.embeds) {
      metadata.embeds = cache.embeds.map(e => ({
        displayText: e.displayText,
        link: e.link,
        line: e.position.start.line + 1,
      }));
    }
    if (cache.sections) {
      metadata.sections = cache.sections.map(s => ({
        type: s.type,
        startLine: s.position.start.line + 1,
        endLine: s.position.end.line + 1,
      }));
    }
    return textResult({success: true, filePath: toAbsPath(file.path), metadata});
  });

  mcp.registerTool('getBacklinks', {
    description: 'Get all notes that link to a given note (backlinks)',
    inputSchema: {filePath: z.string().describe('Path to the note (absolute or vault-relative)')},
  }, async ({filePath}) => {
    const file = resolveFile(filePath);
    if (!file) return textResult({success: false, error: 'File not found'});
    const backlinks: object[] = [];
    const resolved = app.metadataCache.resolvedLinks;
    for (const [sourcePath, targets] of Object.entries(resolved)) {
      if (targets[file.path]) {
        backlinks.push({
          filePath: toAbsPath(sourcePath),
          vaultPath: sourcePath,
          linkCount: targets[file.path],
        });
      }
    }
    return textResult({success: true, filePath: toAbsPath(file.path), backlinks});
  });

  mcp.registerTool('resolveLink', {
    description: 'Resolve an internal wiki-link to its target file path',
    inputSchema: {
      linkText: z.string().describe('The link text (e.g. "My Note" or "folder/My Note")'),
      sourcePath: z.string().optional().describe(
        'Path of the note containing the link, for relative resolution',
      ),
    },
  }, async ({linkText, sourcePath}) => {
    const source = sourcePath ? toVaultPath(sourcePath) : '';
    const dest = app.metadataCache.getFirstLinkpathDest(linkText, source);
    if (!dest) return textResult({resolved: false, linkText});
    return textResult({
      resolved: true,
      linkText,
      filePath: toAbsPath(dest.path),
      vaultPath: dest.path,
    });
  });

  mcp.registerTool('getAllTags', {
    description: 'Get all tags used across the vault with occurrence counts',
    inputSchema: {},
  }, async () => {
    const tagCounts: Record<string, number> = {};
    for (const file of app.vault.getMarkdownFiles()) {
      const cache = app.metadataCache.getFileCache(file);
      if (!cache) continue;
      const fileTags = getAllTags(cache);
      if (fileTags) {
        for (const tag of fileTags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }
    const tags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({
      tag,
      count,
    }));
    return textResult({tags});
  });

  mcp.registerTool('listNotes', {
    description: 'List markdown notes in a vault folder',
    inputSchema: {
      folderPath: z.string().optional().describe('Vault-relative folder path, omit for vault root'),
      recursive: z.boolean().optional().describe('Include notes in subfolders'),
    },
  }, async ({folderPath, recursive}) => {
    const target = folderPath || '';
    const files = app.vault.getMarkdownFiles().filter(f => {
      if (!target) return recursive ? true : !f.path.includes('/');
      if (recursive) return f.path.startsWith(target + '/');
      return f.parent?.path === target;
    });
    const notes = files.map(f => {
      const cache = app.metadataCache.getFileCache(f);
      return {
        filePath: toAbsPath(f.path),
        vaultPath: f.path,
        name: f.basename,
        size: f.stat.size,
        mtime: f.stat.mtime,
        tags: cache ? (getAllTags(cache) || []) : [],
      };
    });
    return textResult({folder: target || '/', notes});
  });

  mcp.registerTool('getVaultInfo', {
    description: 'Get vault name, path, folder tree, and file counts',
    inputSchema: {},
  }, async () => {
    const folders: string[] = [];
    const walk = (folder: TFolder) => {
      if (folder.path) folders.push(folder.path);
      for (const child of folder.children) {
        if (child instanceof TFolder) walk(child);
      }
    };
    walk(app.vault.getRoot());
    return textResult({
      vaultName: app.vault.getName(),
      vaultPath: basePath,
      folders,
      fileCount: app.vault.getFiles().length,
      markdownCount: app.vault.getMarkdownFiles().length,
    });
  });
}
