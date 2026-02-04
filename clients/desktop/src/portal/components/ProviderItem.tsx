import { X } from 'lucide-react';
import type { ProviderState } from '../types/provider';

interface ProviderItemProps {
  provider: ProviderState;
  onRemove: (id: string) => void;
}

export function ProviderItem({provider, onRemove}: ProviderItemProps) {
  return (
    <div className='flex items-center justify-between p-3 bg-vscode-element rounded-lg'>
      <div className='flex flex-col'>
        <span className='font-medium text-vscode-text-header text-sm'>{provider.name}</span>
        <span className='text-xs text-vscode-text-muted'>
          {provider.modelCount} model{provider.modelCount !== 1 ? 's' : ''}
        </span>
      </div>
      <button
        onClick={() => onRemove(provider.id)}
        className='p-1 rounded text-vscode-text-muted hover:text-vscode-error hover:bg-vscode-error/10 transition-colors'
        title='Remove provider'
      >
        <X size={16} />
      </button>
    </div>
  );
}
