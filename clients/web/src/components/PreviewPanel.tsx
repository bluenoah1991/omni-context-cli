import { ChevronLeft, X } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Prism } from 'react-syntax-highlighter';
import { oneLight, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useChatStore } from '../store/chatStore';
import type { PreviewTab } from '../types/uiMessage';

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header';
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

function parsePatch(patch: string): DiffLine[] {
  const lines = patch.split('\n');
  const result: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      result.push({type: 'header', content: line});
    } else if (line.startsWith('+++') || line.startsWith('---')) {
      continue;
    } else if (line.startsWith('+')) {
      result.push({type: 'add', content: line.slice(1), newLineNum: newLine++});
    } else if (line.startsWith('-')) {
      result.push({type: 'remove', content: line.slice(1), oldLineNum: oldLine++});
    } else if (line.startsWith(' ')) {
      result.push({
        type: 'context',
        content: line.slice(1),
        oldLineNum: oldLine++,
        newLineNum: newLine++,
      });
    }
  }
  return result;
}

function getTabLabel(tab: PreviewTab): string {
  const parts = tab.data.filePath.replace(/\\/g, '/').split('/');
  const name = parts[parts.length - 1] || tab.data.filePath;
  return tab.kind === 'diff' ? `${name} (diff)` : name;
}

const DiffContent = memo(function DiffContent({patch}: {patch: string;}) {
  const lines = useMemo(() => parsePatch(patch), [patch]);

  return (
    <div className='font-mono text-xs leading-5 overflow-auto flex-1'>
      {lines.map((line, i) => (
        <div
          key={i}
          className={`flex ${
            line.type === 'add'
              ? 'bg-green-500/15 light:bg-green-500/20'
              : line.type === 'remove'
              ? 'bg-red-500/15 light:bg-red-500/20'
              : line.type === 'header'
              ? 'bg-vscode-element/50 text-vscode-text-muted'
              : ''
          }`}
        >
          <span className='w-10 text-right pr-2 text-vscode-text-muted select-none shrink-0'>
            {line.oldLineNum ?? ''}
          </span>
          <span className='w-10 text-right pr-2 text-vscode-text-muted select-none border-r border-vscode-element shrink-0'>
            {line.newLineNum ?? ''}
          </span>
          <span
            className={`w-5 text-center select-none shrink-0 ${
              line.type === 'add'
                ? 'text-green-500 light:text-green-600'
                : line.type === 'remove'
                ? 'text-red-500 light:text-red-600'
                : 'text-vscode-text-muted'
            }`}
          >
            {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ''}
          </span>
          <pre className='flex-1 whitespace-pre pl-1'>{line.content}</pre>
        </div>
      ))}
    </div>
  );
});

const EXTENSION_LANGUAGES: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  cs: 'csharp',
  php: 'php',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  sql: 'sql',
  json: 'json',
  jsonc: 'json',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'toml',
  html: 'html',
  xml: 'xml',
  css: 'css',
  scss: 'scss',
  less: 'less',
  md: 'markdown',
  mdx: 'markdown',
  vue: 'html',
  svelte: 'html',
  svg: 'xml',
  graphql: 'graphql',
  proto: 'protobuf',
  dockerfile: 'docker',
  makefile: 'makefile',
};

function langFromPath(filePath: string): string | undefined {
  const name = filePath.split('/').pop()?.toLowerCase() || '';
  if (name === 'dockerfile') return 'docker';
  if (name === 'makefile') return 'makefile';
  const dot = name.lastIndexOf('.');
  if (dot === -1) return undefined;
  return EXTENSION_LANGUAGES[name.slice(dot + 1)];
}

const FileContent = memo(function FileContent({tab}: {tab: PreviewTab;}) {
  if (tab.kind === 'diff') return <DiffContent patch={tab.data.patch} />;

  const theme = useChatStore(state => state.theme);
  const codeStyle = theme === 'light' ? oneLight : vscDarkPlus;
  const {data} = tab;

  if (data.error) {
    return (
      <div className='flex-1 flex items-center justify-center text-vscode-text-muted p-8'>
        {data.error}
      </div>
    );
  }

  if (data.type === 'image' && data.base64 && data.mimeType) {
    return (
      <div className='flex-1 overflow-auto flex items-center justify-center p-4'>
        <img
          src={`data:${data.mimeType};base64,${data.base64}`}
          alt={data.filePath}
          className='max-w-full max-h-full object-contain'
        />
      </div>
    );
  }

  if (data.type === 'binary') {
    return (
      <div className='flex-1 flex items-center justify-center text-vscode-text-muted p-8'>
        Binary file -- can't preview this one
      </div>
    );
  }

  const language = langFromPath(data.filePath);
  return (
    <div className='overflow-auto flex-1 text-xs'>
      <Prism
        style={codeStyle}
        language={language || 'text'}
        showLineNumbers
        lineNumberStyle={{
          minWidth: '3em',
          paddingRight: '1em',
          color: 'var(--color-vscode-text-muted)',
          userSelect: 'none',
        }}
        codeTagProps={{style: {background: 'transparent'}}}
        customStyle={{
          margin: 0,
          padding: '0.5rem 0',
          background: 'var(--color-vscode-bg)',
          fontSize: 'inherit',
        }}
      >
        {data.content || ''}
      </Prism>
    </div>
  );
});

export const PreviewPanel = memo(function PreviewPanel() {
  const {
    previewPanelOpen,
    previewPanelWidth,
    previewTabs,
    activePreviewTab,
    closePreviewPanel,
    closePreviewTab,
    setActivePreviewTab,
    setPreviewPanelWidth,
    pinPreviewTab,
  } = useChatStore();

  const [isResizing, setIsResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = previewPanelWidth;
    e.preventDefault();
  }, [previewPanelWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startX.current - e.clientX;
      setPreviewPanelWidth(startWidth.current + delta);
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setPreviewPanelWidth]);

  if (!previewPanelOpen || previewTabs.length === 0) return null;

  const activeTab = previewTabs[activePreviewTab];

  return (
    <div className='flex-none flex text-sm' style={{width: previewPanelWidth}}>
      <div
        className={`w-1 flex-none cursor-col-resize transition-colors ${
          isResizing ? 'bg-vscode-accent' : 'bg-vscode-element hover:bg-vscode-accent'
        }`}
        onMouseDown={handleMouseDown}
      />
      <div className='flex-1 flex flex-col bg-vscode-bg min-w-0'>
        <div className='safe-area-top flex items-center gap-3 pb-2 px-4 border-b border-vscode-element'>
          <button
            onClick={closePreviewPanel}
            className='p-2.5 bg-vscode-element hover:brightness-110 text-vscode-text-header rounded-md border border-vscode-border hover:border-vscode-border-active'
            title='Close panel'
          >
            <ChevronLeft size={16} />
          </button>
          <span className='font-medium text-vscode-text'>Preview</span>
        </div>

        <div className='flex border-b border-vscode-element overflow-x-auto'>
          {previewTabs.map((tab, i) => (
            <div
              key={`${tab.data.filePath}:${i}`}
              className={`group flex items-center gap-2 px-4 py-2.5 cursor-pointer border-b-2 -mb-px ${
                i === activePreviewTab
                  ? 'border-vscode-accent text-vscode-text'
                  : 'border-transparent text-vscode-text-muted hover:text-vscode-text'
              }`}
              onClick={() => setActivePreviewTab(i)}
              onDoubleClick={() => pinPreviewTab(i)}
            >
              <span
                className={`truncate max-w-37.5 ${!tab.pinned ? 'italic' : ''}`}
                title={tab.data.filePath}
              >
                {getTabLabel(tab)}
              </span>
              <button
                onClick={e => {
                  e.stopPropagation();
                  closePreviewTab(i);
                }}
                className='p-0.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-vscode-element text-vscode-text-muted'
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className='px-4 py-2.5 text-xs text-vscode-text-muted border-b border-vscode-element truncate font-mono'>
          {activeTab && activeTab.data.filePath}
        </div>

        {activeTab && <FileContent tab={activeTab} />}
      </div>
    </div>
  );
});
