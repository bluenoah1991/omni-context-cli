import type { LucideIcon } from 'lucide-react';

interface StatusIconProps {
  icon: LucideIcon;
  active?: boolean;
  title: string;
}

export function StatusIcon({icon: Icon, active, title}: StatusIconProps) {
  return (
    <div
      className={`p-1 rounded transition-colors ${
        active ? 'text-vscode-text' : 'text-vscode-border-active'
      }`}
      title={`${title}: ${active ? 'On' : 'Off'}`}
    >
      <Icon size={14} />
    </div>
  );
}
