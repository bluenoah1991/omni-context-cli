import { Globe, SquarePen, Wrench } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useChatStore } from '../store/chatStore';
import type { FileDiff } from '../types/uiMessage';
import { CollapsibleBlock } from './CollapsibleBlock';

interface ToolCallBlockProps {
  toolName: string;
  toolCallId?: string;
  toolResult?: string;
}

export const ToolCallBlock = memo(
  function ToolCallBlock({toolName, toolCallId, toolResult}: ToolCallBlockProps) {
    const openDiffPanel = useChatStore(state => state.openDiffPanel);

    const {displayContent, isError, diffs} = useMemo(() => {
      if (!toolResult) {
        return {displayContent: undefined, isError: false, diffs: null};
      }
      try {
        const resultData = JSON.parse(toolResult);
        if (resultData.error) {
          return {displayContent: resultData.error, isError: true, diffs: null};
        }
        return {
          displayContent: resultData.displayText || 'Tool completed successfully',
          isError: false,
          diffs: resultData.success ? (resultData.diffs as FileDiff[] | undefined) || null : null,
        };
      } catch {
        return {displayContent: toolResult, isError: false, diffs: null};
      }
    }, [toolResult]);

    const handleClick = useCallback(() => {
      if (diffs && diffs.length > 0) {
        diffs.forEach(diff => openDiffPanel({...diff, toolUseId: toolCallId}));
      }
    }, [diffs, toolCallId, openDiffPanel]);

    const title = `Calling: ${toolName.charAt(0).toUpperCase()}${toolName.slice(1)}`;
    const hasDiffs = diffs && diffs.length > 0;
    const isWebSearch = toolName === 'WebSearch';

    const icon = isWebSearch
      ? <Globe size={14} />
      : hasDiffs
      ? <SquarePen size={14} />
      : <Wrench size={14} />;

    const variant = isError ? 'red' : isWebSearch ? 'green' : 'blue';

    return (
      <div
        onClick={hasDiffs ? handleClick : undefined}
        className={hasDiffs ? 'cursor-pointer' : ''}
      >
        <CollapsibleBlock
          icon={icon}
          title={title}
          content={displayContent}
          loading={!toolResult}
          variant={variant}
          clickable={hasDiffs || false}
        />
      </div>
    );
  },
);
