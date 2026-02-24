import { memo, useMemo } from 'react';

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header';
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

export function parsePatch(patch: string): DiffLine[] {
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

export const DiffContent = memo(function DiffContent({patch}: {patch: string;}) {
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
