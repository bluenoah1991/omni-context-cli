import { ChevronDown, ChevronRight, Folder, FolderOpen, RefreshCw } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from '../i18n';
import { fetchFiles, type FileEntry } from '../services/fileService';
import { useChatStore } from '../store/chatStore';
import { getFileIcon } from '../utils/fileIcons';

interface DirState {
  entries: FileEntry[];
  loading: boolean;
  expanded: boolean;
}

const FileTreeNode = memo(
  function FileTreeNode(
    {entry, depth, dirs, onToggle, onFileClick}: {
      entry: FileEntry;
      depth: number;
      dirs: Map<string, DirState>;
      onToggle: (path: string) => void;
      onFileClick: (path: string) => void;
    },
  ) {
    const t = useLocale();
    const isDir = entry.type === 'directory';
    const dirState = isDir ? dirs.get(entry.path) : undefined;
    const expanded = dirState?.expanded ?? false;

    const Chevron = expanded ? ChevronDown : ChevronRight;
    const FolderIcon = expanded ? FolderOpen : Folder;
    const {icon: FileIcon, color: fileColor} = getFileIcon(entry.name);

    return (
      <>
        <button
          className='flex items-center gap-1.5 w-full px-2 py-1.5 text-left text-sm cursor-pointer hover:bg-vscode-element/50 rounded-sm truncate'
          style={{paddingLeft: `${depth * 12 + 8}px`}}
          onClick={() => isDir ? onToggle(entry.path) : onFileClick(entry.path)}
          title={entry.path}
        >
          {isDir
            ? <Chevron size={12} className='shrink-0 text-vscode-text-muted' />
            : <span className='w-3 shrink-0' />}
          {isDir
            ? <FolderIcon size={14} className='shrink-0 text-vscode-accent' />
            : <FileIcon size={14} className={`shrink-0 ${fileColor}`} />}
          <span className='truncate text-vscode-text'>{entry.name}</span>
        </button>
        {isDir && expanded && dirState && (dirState.loading
          ? (
            <div
              className='text-sm text-vscode-text-muted py-1'
              style={{paddingLeft: `${(depth + 1) * 12 + 20}px`}}
            >
              {t.files.loading}
            </div>
          )
          : (dirState.entries.map(child => (
            <FileTreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              dirs={dirs}
              onToggle={onToggle}
              onFileClick={onFileClick}
            />
          ))))}
      </>
    );
  },
);

export const FileTree = memo(function FileTree() {
  const t = useLocale();
  const {fileTreeOpen, fileTreeWidth, setFileTreeWidth, openFilePreview, config} = useChatStore();

  const [dirs, setDirs] = useState<Map<string, DirState>>(new Map());
  const [rootEntries, setRootEntries] = useState<FileEntry[]>([]);
  const [rootLoading, setRootLoading] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const loadDir = useCallback(async (dirPath: string) => {
    const {data} = await fetchFiles(dirPath);
    return data?.entries || [];
  }, []);

  const loadRoot = useCallback(async () => {
    setRootLoading(true);
    const entries = await loadDir('.');
    setRootEntries(entries);
    setRootLoading(false);
  }, [loadDir]);

  useEffect(() => {
    if (fileTreeOpen && rootEntries.length === 0) {
      loadRoot();
    }
    if (fileTreeOpen && fileTreeWidth === 0) {
      setFileTreeWidth(Math.round(window.innerWidth * 0.3));
    }
  }, [fileTreeOpen, rootEntries.length, loadRoot, fileTreeWidth, setFileTreeWidth]);

  const handleToggle = useCallback(async (dirPath: string) => {
    setDirs(prev => {
      const next = new Map(prev);
      const existing = next.get(dirPath);
      if (existing?.expanded) {
        next.set(dirPath, {...existing, expanded: false});
        return next;
      }
      if (existing?.entries.length) {
        next.set(dirPath, {...existing, expanded: true});
        return next;
      }
      next.set(dirPath, {entries: [], loading: true, expanded: true});
      return next;
    });

    const existing = dirs.get(dirPath);
    if (existing?.entries.length) return;

    const entries = await loadDir(dirPath);
    setDirs(prev => {
      const next = new Map(prev);
      next.set(dirPath, {entries, loading: false, expanded: true});
      return next;
    });
  }, [dirs, loadDir]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = fileTreeWidth;
    e.preventDefault();
  }, [fileTreeWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX.current;
      setFileTreeWidth(startWidth.current + delta);
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setFileTreeWidth]);

  if (!fileTreeOpen) return null;

  return (
    <div className='flex-none flex text-sm' style={{width: fileTreeWidth}}>
      <div className='flex-1 flex flex-col bg-vscode-bg min-w-0 border-r border-vscode-element'>
        <div className='safe-area-top flex items-center justify-between px-4 pb-2 border-b border-vscode-element'>
          <span className='font-medium text-vscode-text uppercase truncate'>
            {config?.projectName || t.files.fallbackTitle}
          </span>
          <button
            onClick={loadRoot}
            className='p-2.5 rounded-md transition-all duration-200 shrink-0 border border-transparent text-vscode-text-muted hover:text-vscode-text hover:bg-vscode-element'
            title={t.files.refresh}
          >
            <RefreshCw size={16} />
          </button>
        </div>
        <div className='flex-1 overflow-y-auto overflow-x-hidden py-1'>
          {rootLoading
            ? <div className='text-sm text-vscode-text-muted px-4 py-2'>{t.files.loading}</div>
            : (rootEntries.map(entry => (
              <FileTreeNode
                key={entry.path}
                entry={entry}
                depth={0}
                dirs={dirs}
                onToggle={handleToggle}
                onFileClick={openFilePreview}
              />
            )))}
        </div>
      </div>
      <div
        className={`w-1 flex-none cursor-col-resize transition-colors ${
          isResizing ? 'bg-vscode-accent' : 'bg-vscode-element hover:bg-vscode-accent'
        }`}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
});
