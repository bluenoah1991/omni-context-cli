import { useEffect, useRef } from 'react';
import type { SlashCommand } from '../types/slash';

interface SlashCommandPickerProps {
  commands: SlashCommand[];
  selectedIndex: number;
  onSelect: (commandName: string) => void;
}

export default function SlashCommandPicker(
  {commands, selectedIndex, onSelect}: SlashCommandPickerProps,
) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedRef.current && listRef.current) {
      const list = listRef.current;
      const selected = selectedRef.current;
      const listRect = list.getBoundingClientRect();
      const selectedRect = selected.getBoundingClientRect();

      if (selectedRect.top < listRect.top) {
        selected.scrollIntoView({block: 'nearest'});
      } else if (selectedRect.bottom > listRect.bottom) {
        selected.scrollIntoView({block: 'nearest'});
      }
    }
  }, [selectedIndex]);

  if (commands.length === 0) {
    return null;
  }

  return (
    <div className='absolute bottom-full left-0 right-0 mb-1 z-10'>
      <div
        ref={listRef}
        className='bg-vscode-sidebar border border-vscode-border rounded-lg shadow-lg max-h-48 overflow-y-auto'
      >
        {commands.map((command, index) => (
          <div
            key={command.name}
            ref={index === selectedIndex ? selectedRef : null}
            onClick={() => onSelect(command.name)}
            className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
              index === selectedIndex
                ? 'bg-vscode-accent/20 text-vscode-text'
                : 'text-vscode-text-muted hover:bg-vscode-element'
            }`}
          >
            <span className='font-medium'>/{command.name}</span>
            {command.description && (
              <span className='text-vscode-text-muted text-sm'>{command.description}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
