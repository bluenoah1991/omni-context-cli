import type { LucideIcon } from 'lucide-react';
import { memo } from 'react';

interface IconButtonProps {
  icon: LucideIcon;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}

export const IconButton = memo(
  function IconButton({icon: Icon, title, onClick, disabled = false}: IconButtonProps) {
    return (
      <button
        type='button'
        onClick={onClick}
        disabled={disabled}
        className={`p-2.5 rounded-md transition-all duration-200 shrink-0 border border-transparent ${
          disabled
            ? 'text-vscode-text-muted cursor-not-allowed opacity-50'
            : 'text-vscode-text-muted hover:text-vscode-text hover:bg-vscode-element'
        }`}
        title={title}
      >
        <Icon size={16} />
      </button>
    );
  },
);
