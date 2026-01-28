import { ChevronLeft, X } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChatStore } from '../store/chatStore';

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

function getFileName(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || filePath;
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

export const DiffPanel = memo(function DiffPanel() {
  const {
    diffPanelOpen,
    diffPanelWidth,
    diffTabs,
    activeDiffTab,
    closeDiffPanel,
    closeDiffTab,
    setActiveDiffTab,
    setDiffPanelWidth,
  } = useChatStore();

  const [isResizing, setIsResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = diffPanelWidth;
    e.preventDefault();
  }, [diffPanelWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startX.current - e.clientX;
      setDiffPanelWidth(startWidth.current + delta);
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setDiffPanelWidth]);

  if (!diffPanelOpen || diffTabs.length === 0) return null;

  const activeTab = diffTabs[activeDiffTab];

  return (
    <div className='flex-none flex text-sm' style={{width: diffPanelWidth}}>
      <div
        className={`w-1 flex-none cursor-col-resize transition-colors ${
          isResizing ? 'bg-vscode-accent' : 'bg-vscode-element hover:bg-vscode-accent'
        }`}
        onMouseDown={handleMouseDown}
      />
      <div className='flex-1 flex flex-col bg-vscode-bg min-w-0'>
        <div className='flex items-center gap-3 pt-3 pb-2 px-4 border-b border-vscode-element'>
          <button
            onClick={closeDiffPanel}
            className='p-2.5 bg-vscode-element hover:brightness-110 text-vscode-text-header rounded-lg border border-vscode-border hover:border-vscode-border-active'
            title='Close panel'
          >
            <ChevronLeft size={16} />
          </button>
          <span className='font-medium text-vscode-text'>Diff View</span>
        </div>

        <div className='flex border-b border-vscode-element overflow-x-auto'>
          {diffTabs.map((tab, i) => (
            <div
              key={`${tab.filePath}:${tab.toolUseId ?? i}`}
              className={`group flex items-center gap-2 px-4 py-2.5 cursor-pointer border-b-2 -mb-px ${
                i === activeDiffTab
                  ? 'border-vscode-accent text-vscode-text'
                  : 'border-transparent text-vscode-text-muted hover:text-vscode-text'
              }`}
              onClick={() => setActiveDiffTab(i)}
            >
              <span className='truncate max-w-37.5' title={tab.filePath}>
                {getFileName(tab.filePath)}
              </span>
              <button
                onClick={e => {
                  e.stopPropagation();
                  closeDiffTab(i);
                }}
                className='p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-vscode-element text-vscode-text-muted'
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className='px-4 py-2.5 text-xs text-vscode-text-muted border-b border-vscode-element truncate font-mono'>
          {activeTab?.filePath}
        </div>

        {activeTab && <DiffContent patch={activeTab.patch} />}
      </div>
    </div>
  );
});
