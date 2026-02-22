import { Brain } from 'lucide-react';
import { memo } from 'react';
import { useChatStore } from '../store/chatStore';
import { CollapsibleBlock } from './CollapsibleBlock';

interface ThinkingBlockProps {
  content: string;
  loading?: boolean;
}

export const ThinkingBlock = memo(
  function ThinkingBlock({content, loading = false}: ThinkingBlockProps) {
    const thinkingExpanded = useChatStore(state => state.thinkingExpanded);

    return (
      <CollapsibleBlock
        icon={<Brain size={14} />}
        title='Thinking Process'
        content={content}
        loading={loading}
        expandableWhileLoading
        defaultExpanded={thinkingExpanded}
        variant='purple'
        renderMarkdown
      />
    );
  },
);
