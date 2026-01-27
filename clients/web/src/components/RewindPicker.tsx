import { useEffect, useRef } from 'react';
import type { RewindPoint } from '../types/rewind';

interface RewindPickerProps {
  points: RewindPoint[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export default function RewindPicker({points, selectedIndex, onSelect}: RewindPickerProps) {
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

  if (points.length === 0) {
    return (
      <div className='absolute bottom-full left-0 right-0 mb-1 z-10'>
        <div className='bg-vscode-sidebar border border-vscode-border rounded-lg shadow-lg px-3 py-2 text-vscode-text-muted text-sm'>
          No messages to rewind to
        </div>
      </div>
    );
  }

  return (
    <div className='absolute bottom-full left-0 right-0 mb-1 z-10'>
      <div className='bg-vscode-sidebar border border-vscode-border rounded-lg shadow-lg px-3 py-2 text-vscode-text-muted text-sm mb-1'>
        Rewind to which message?
      </div>
      <div
        ref={listRef}
        className='bg-vscode-sidebar border border-vscode-border rounded-lg shadow-lg max-h-48 overflow-y-auto'
      >
        {points.map((point, index) => (
          <div
            key={point.index}
            ref={index === selectedIndex ? selectedRef : null}
            onClick={() => onSelect(point.index)}
            className={`px-3 py-2 cursor-pointer ${
              index === selectedIndex
                ? 'bg-vscode-accent/20 text-vscode-text'
                : 'text-vscode-text-muted hover:bg-vscode-element'
            }`}
          >
            <span className='font-medium'>{points.length - index}.</span>{' '}
            <span className='text-sm'>{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
