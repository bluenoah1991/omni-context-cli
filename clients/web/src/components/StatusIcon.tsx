import type { LucideIcon } from 'lucide-react';
import { useLocale } from '../i18n';

interface StatusIconProps {
  icon: LucideIcon;
  active?: boolean;
  title: string;
  showStatus?: boolean;
}

export function StatusIcon({icon: Icon, active, title, showStatus = true}: StatusIconProps) {
  const t = useLocale();
  const displayTitle = showStatus ? `${title}: ${active ? t.status.on : t.status.off}` : title;
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
