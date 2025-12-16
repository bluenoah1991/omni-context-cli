import { useMemo } from 'react';

export function useCleanedContent(content: string): string {
  return useMemo(() => {
    return content.replace(/\n{2,}/g, '\n').trim();
  }, [content]);
}
