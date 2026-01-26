interface ToggleOptionProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function ToggleOption({label, description, enabled, onChange}: ToggleOptionProps) {
  return (
    <div className='flex items-center justify-between p-4 bg-vscode-bg border border-vscode-border rounded-lg'>
      <div>
        <div className='text-sm font-medium text-vscode-text'>{label}</div>
        <div className='text-xs text-vscode-text-muted mt-1'>{description}</div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ml-4 ${
          enabled ? 'bg-vscode-accent' : 'bg-vscode-border'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${
            enabled ? 'left-7' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}
