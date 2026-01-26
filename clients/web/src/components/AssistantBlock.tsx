import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism } from 'react-syntax-highlighter';
import { oneLight, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { useChatStore } from '../store/chatStore';

interface AssistantBlockProps {
  content: string;
}

export const AssistantBlock = memo(function AssistantBlock({content}: AssistantBlockProps) {
  if (!content.trim()) return null;

  const theme = useChatStore(state => state.theme);
  const codeStyle = theme === 'light' ? oneLight : vscDarkPlus;

  const components = useMemo(() => ({
    code(props: any) {
      const {className, children, ...rest} = props;
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const isInline = !match;

      return !isInline && language
        ? (
          <div className='rounded-md overflow-hidden my-4 border border-vscode-border'>
            <div className='bg-vscode-element px-3 py-1 text-xs text-vscode-text-muted border-b border-vscode-border flex items-center justify-between'>
              <span>{language}</span>
            </div>
            <Prism
              style={codeStyle}
              language={language}
              PreTag='div'
              customStyle={{margin: 0, padding: '1rem', background: 'var(--color-vscode-bg)'}}
            >
              {String(children).replace(/\n$/, '')}
            </Prism>
          </div>
        )
        : <code className={className} {...rest}>{children}</code>;
    },
  }), [codeStyle]);

  return (
    <div className='animate-fade-in flex justify-start'>
      <div className='rounded-md py-2 text-vscode-text prose prose-sm prose-invert light:prose-neutral max-w-none markdown-content'>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{content}</ReactMarkdown>
      </div>
    </div>
  );
});
