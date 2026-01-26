interface SegmentedControlProps<T extends string> {
  label: string;
  description: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  optionLabels?: Record<T, string>;
}

export default function SegmentedControl<T extends string>(
  {label, description, options, value, onChange, optionLabels}: SegmentedControlProps<T>,
) {
  return (
    <div className='flex items-center justify-between p-3 rounded-lg hover:bg-vscode-element/50 transition-colors'>
      <div className='flex flex-col gap-1'>
        <span className='font-medium text-vscode-text'>{label}</span>
        <span className='text-xs text-vscode-text-muted'>{description}</span>
      </div>
      <div className='flex bg-vscode-element border border-vscode-border rounded-lg overflow-hidden p-0.5'>
        {options.map(option => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
              value === option
                ? 'bg-vscode-accent text-white shadow-sm'
                : 'text-vscode-text-muted hover:text-vscode-text hover:bg-vscode-element/50'
            }`}
          >
            {optionLabels?.[option] ?? option}
          </button>
        ))}
      </div>
    </div>
  );
}
