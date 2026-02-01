import type { LucideIcon } from 'lucide-react';

interface StatusIconProps {
  icon: LucideIcon;
  active?: boolean;
  title: string;
  showStatus?: boolean;
}

export function StatusIcon({icon: Icon, active, title, showStatus = true}: StatusIconProps) {
  const displayTitle = showStatus ? `${title}: ${active ? 'On' : 'Off'}` : title;
  return (
    <div
      className={`p-1 rounded-md transition-colors ${
        active ? 'text-vscode-text' : 'text-vscode-border-active'
      }`}
      title={displayTitle}
    >
      <Icon size={14} />
    </div>
  );
}
