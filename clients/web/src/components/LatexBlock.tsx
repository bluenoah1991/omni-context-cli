import katex from 'katex';
import { memo, useMemo } from 'react';

interface LatexBlockProps {
  code: string;
}

export const LatexBlock = memo(function LatexBlock({code}: LatexBlockProps) {
  const rendered = useMemo(() => {
    try {
      return {
        html: katex.renderToString(code, {displayMode: true, throwOnError: false, trust: true}),
        error: null,
      };
    } catch (err) {
      return {html: '', error: err instanceof Error ? err.message : 'Failed to render LaTeX'};
    }
  }, [code]);

  if (rendered.error) {
    return (
      <div className='my-4 p-4 bg-vscode-error/10 border border-vscode-error/50 rounded-md text-sm text-vscode-text'>
        <div className='font-medium mb-2'>LaTeX Error</div>
        <pre className='text-xs whitespace-pre-wrap'>{rendered.error}</pre>
      </div>
    );
  }

  return (
    <div
      className='my-4 py-4 overflow-x-auto text-center'
      dangerouslySetInnerHTML={{__html: rendered.html}}
    />
  );
});
