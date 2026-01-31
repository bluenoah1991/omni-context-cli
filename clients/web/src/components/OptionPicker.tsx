import { useEffect, useState } from 'react';

interface OptionItem {
  key: string;
  label: string;
}

interface OptionPickerProps {
  title: string;
  options: OptionItem[];
  onSelect: (key: string) => void;
  onCancel?: () => void;
}

export function OptionPicker({title, options, onSelect, onCancel}: OptionPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => (i <= 0 ? options.length - 1 : i - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => (i >= options.length - 1 ? 0 : i + 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (options[selectedIndex]) {
          onSelect(options[selectedIndex].key);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options, selectedIndex, onSelect, onCancel]);

  if (options.length === 0) return null;

  return (
    <div className='absolute bottom-full left-0 right-0 mb-1 z-10'>
      <div className='bg-vscode-sidebar border border-vscode-border rounded-lg shadow-lg overflow-hidden'>
        <div className='px-3 py-2 text-vscode-text font-medium border-b border-vscode-border'>
          {title}
        </div>
        {options.map((opt, i) => (
          <div
            key={opt.key}
            className={`px-3 py-2 cursor-pointer ${
              i === selectedIndex
                ? 'bg-vscode-accent/20 text-vscode-text'
                : 'text-vscode-text-muted hover:bg-vscode-element'
            }`}
            onClick={() => onSelect(opt.key)}
            onMouseEnter={() => setSelectedIndex(i)}
          >
            {opt.label}
          </div>
        ))}
      </div>
    </div>
  );
}
