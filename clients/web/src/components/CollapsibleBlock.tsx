import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { memo, useState } from 'react';

interface CollapsibleBlockProps {
  icon: React.ReactNode;
  title: string;
  content?: string;
  loading?: boolean;
  expandableWhileLoading?: boolean;
  variant: 'purple' | 'blue' | 'red';
}

const variantStyles = {
  purple: {
    container: 'bg-vscode-element/30 border-purple-500/20 hover:border-purple-500/40',
    header: 'text-purple-400',
    content: 'text-purple-300/90',
  },
  blue: {
    container: 'bg-vscode-element/30 border-blue-500/20 hover:border-blue-500/40',
    header: 'text-blue-400',
    content: 'text-blue-300/90',
  },
  red: {
    container: 'bg-red-900/10 border-red-500/20 hover:border-red-500/40',
    header: 'text-red-400',
    content: 'text-red-300/90',
  },
};

export const CollapsibleBlock = memo(
  function CollapsibleBlock(
    {icon, title, content, loading = false, expandableWhileLoading = false, variant}:
      CollapsibleBlockProps,
  ) {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasContent = content !== undefined && content !== '';
    const canExpand = hasContent && (!loading || expandableWhileLoading);
    const styles = variantStyles[variant];

    return (
      <div
        className={`rounded-md border text-sm transition-all duration-200 overflow-hidden w-full ${styles.container}`}
      >
        <div
          onClick={() => canExpand && setIsExpanded(!isExpanded)}
          className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
            canExpand ? 'cursor-pointer hover:bg-white/5' : ''
          }`}
        >
          <div className={styles.header}>{icon}</div>
          <span className={`font-medium ${styles.header}`}>{title}</span>
          <div className={`ml-auto ${styles.header} opacity-70`}>
            {loading
              ? <Loader2 size={14} className='animate-spin' />
              : hasContent
              ? (isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />)
              : null}
          </div>
        </div>

        {isExpanded && hasContent && (
          <div className='px-4 pb-3 animate-fade-in'>
            <div className='h-px bg-white/5 mb-3' />
            <pre
              className={`text-xs font-mono whitespace-pre-wrap wrap-break-word ${styles.content} max-h-60 overflow-y-auto custom-scrollbar`}
            >
              {content}
            </pre>
          </div>
        )}
      </div>
    );
  },
);
