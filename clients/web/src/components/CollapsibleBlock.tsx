import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface CollapsibleBlockProps {
  icon: React.ReactNode;
  title: string;
  content?: string;
  loading?: boolean;
  expandableWhileLoading?: boolean;
  defaultExpanded?: boolean;
  variant: 'muted' | 'blue' | 'red' | 'green';
  clickable?: boolean;
  renderMarkdown?: boolean;
  children?: React.ReactNode;
}

const variantStyles = {
  muted: {
    container:
      'bg-vscode-element/20 border-vscode-border hover:border-vscode-border-active light:bg-slate-50/50 light:border-slate-200 light:hover:border-slate-300',
    header: 'text-vscode-text-muted light:text-slate-500',
    content: 'text-vscode-text-muted/80 light:text-slate-500',
  },
  blue: {
    container:
      'bg-vscode-element/20 border-blue-500/20 hover:border-blue-500/30 light:bg-slate-50/50 light:border-blue-300/40 light:hover:border-blue-300/60',
    header: 'text-blue-400/80 light:text-blue-600',
    content: 'text-blue-300/70 light:text-blue-700',
  },
  red: {
    container:
      'bg-vscode-element/20 border-red-500/20 hover:border-red-500/30 light:bg-slate-50/50 light:border-red-300/40 light:hover:border-red-300/60',
    header: 'text-red-400/80 light:text-red-600',
    content: 'text-red-300/70 light:text-red-700',
  },
  green: {
    container:
      'bg-vscode-element/20 border-green-500/20 hover:border-green-500/30 light:bg-slate-50/50 light:border-green-300/40 light:hover:border-green-300/60',
    header: 'text-green-400/80 light:text-green-600',
    content: 'text-green-300/70 light:text-green-700',
  },
};

export const CollapsibleBlock = memo(
  function CollapsibleBlock(
    {
      icon,
      title,
      content,
      loading = false,
      expandableWhileLoading = false,
      defaultExpanded = false,
      variant,
      clickable = false,
      renderMarkdown = false,
      children,
    }: CollapsibleBlockProps,
  ) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const hasContent = content !== undefined && content !== '';
    const canExpand = hasContent && (!loading || expandableWhileLoading);
    const styles = variantStyles[variant];

    return (
      <div
        className={`rounded-md border text-sm transition-all duration-200 overflow-hidden w-full ${styles.container} ${
          clickable ? 'ring-1 ring-blue-400/30' : ''
        }`}
      >
        <div
          onClick={() => canExpand && setIsExpanded(!isExpanded)}
          className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
            canExpand ? 'cursor-pointer hover:bg-white/5 light:hover:bg-black/5' : ''
          }`}
        >
          <div className={`shrink-0 ${styles.header}`}>{icon}</div>
          <span className={`font-medium truncate min-w-0 ${styles.header}`}>{title}</span>
          <div className={`ml-auto shrink-0 ${styles.header} opacity-70`}>
            {loading
              ? <Loader2 size={14} className='animate-spin' />
              : hasContent
              ? (isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />)
              : null}
          </div>
        </div>

        {isExpanded && hasContent && (
          <div className='px-4 pb-3'>
            <div className='h-px bg-white/5 light:bg-black/10 mb-3' />
            {renderMarkdown
              ? (
                <div
                  className={`thinking-markdown break-words max-h-60 overflow-y-auto custom-scrollbar ${styles.content}`}
                >
                  <ReactMarkdown>{content!}</ReactMarkdown>
                </div>
              )
              : (
                <pre
                  className={`text-xs font-mono whitespace-pre-wrap wrap-break-word max-h-60 overflow-y-auto custom-scrollbar ${styles.content}`}
                >
                  {content}
                </pre>
              )}
          </div>
        )}
        {children}
      </div>
    );
  },
);
