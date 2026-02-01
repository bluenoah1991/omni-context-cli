import 'katex/dist/katex.min.css';
import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism } from 'react-syntax-highlighter';
import { oneLight, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import rehypeKatex from 'rehype-katex';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { useChatStore } from '../store/chatStore';
import type { Attachment } from '../types/uiMessage';
import { AttachmentList } from './AttachmentList';
import { LatexBlock } from './LatexBlock';
import { MermaidBlock } from './MermaidBlock';

interface AssistantBlockProps {
  content: string;
  attachments?: Attachment[];
  isLoading?: boolean;
}

export const AssistantBlock = memo(
  function AssistantBlock({content, attachments, isLoading}: AssistantBlockProps) {
    if (!content.trim() && (!attachments || attachments.length === 0)) return null;

    const theme = useChatStore(state => state.theme);
    const codeStyle = theme === 'light' ? oneLight : vscDarkPlus;

    const components = useMemo(() => ({
      code(props: any) {
        const {className, children, ...rest} = props;
        const match = /language-(\w+)/.exec(className || '');
        const language = match ? match[1] : '';
        const isInline = !match;
        const code = String(children).replace(/\n$/, '');

        if (language === 'mermaid') {
          return <MermaidBlock code={code} isLoading={isLoading} />;
        }

        if (language === 'latex' || language === 'tex' || language === 'math') {
          return <LatexBlock code={code} />;
        }

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
                {code}
              </Prism>
            </div>
          )
          : <code className={className} {...rest}>{children}</code>;
      },
    }), [codeStyle, isLoading]);

    return (
      <div className='w-full'>
        {content.trim() && (
          <div className='rounded-md py-2 text-vscode-text prose prose-sm prose-invert light:prose-neutral max-w-none markdown-content'>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={components}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
        <AttachmentList attachments={attachments} />
      </div>
    );
  },
);
