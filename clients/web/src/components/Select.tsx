import { ChevronDown } from 'lucide-react';
import { memo } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = memo(
  function Select(
    {label, description, value, onChange, options, placeholder = 'Select an option'}: SelectProps,
  ) {
    return (
      <div className='space-y-2'>
        <label className='block text-sm font-medium text-vscode-text'>{label}</label>
        <div className='relative'>
          <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className='w-full px-4 py-2.5 bg-vscode-bg border border-vscode-border rounded-lg text-sm text-vscode-text focus:outline-none focus:border-vscode-accent focus:ring-1 focus:ring-vscode-accent appearance-none'
          >
            <option value=''>{placeholder}</option>
            {options.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <div className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-vscode-text-muted'>
            <ChevronDown size={14} />
          </div>
        </div>
        {description && <p className='text-xs text-vscode-text-muted'>{description}</p>}
      </div>
    );
  },
);
