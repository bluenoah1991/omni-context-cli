import { X } from 'lucide-react';
import type { ProviderState } from '../types/provider';

interface ProviderItemProps {
  provider: ProviderState;
  onRemove: (id: string) => void;
  formatModelCount: (count: number) => string;
  removeTitle: string;
}

export function ProviderItem(
  {provider, onRemove, formatModelCount, removeTitle}: ProviderItemProps,
) {
  return (
    <div className='flex items-center justify-between p-4 bg-vscode-element rounded-lg border border-vscode-border'>
      <div className='flex flex-col'>
        <span className='font-medium text-vscode-text-header text-sm'>{provider.name}</span>
        <span className='text-sm text-vscode-text-muted'>
          {formatModelCount(provider.modelCount)}
        </span>
      </div>
      <button
        onClick={() => onRemove(provider.id)}
        className='p-2 rounded text-vscode-text-muted hover:text-vscode-error hover:bg-vscode-error/10 transition-colors cursor-pointer'
        title={removeTitle}
      >
        <X size={16} />
      </button>
    </div>
  );
}
