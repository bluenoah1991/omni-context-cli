import { useMemo } from 'react';

export function useCleanedContent(content: string | undefined | null): string {
  return useMemo(() => {
    if (!content) return '';
    return content.replace(/\n{2,}/g, '\n').trim();
  }, [content]);
}
