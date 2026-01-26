import { Wrench } from 'lucide-react';
import { memo, useMemo } from 'react';
import { CollapsibleBlock } from './CollapsibleBlock';

interface ToolCallBlockProps {
  toolName: string;
  toolResult?: string;
}

export const ToolCallBlock = memo(
  function ToolCallBlock({toolName, toolResult}: ToolCallBlockProps) {
    const {displayContent, isError} = useMemo(() => {
      if (!toolResult) {
        return {displayContent: undefined, isError: false};
      }
      try {
        const resultData = JSON.parse(toolResult);
        if (resultData.error) {
          return {displayContent: resultData.error, isError: true};
        }
        return {
          displayContent: resultData.displayText || 'Tool completed successfully',
          isError: false,
        };
      } catch {
        return {displayContent: toolResult, isError: false};
      }
    }, [toolResult]);

    const title = `Calling: ${toolName.charAt(0).toUpperCase()}${toolName.slice(1)}`;

    return (
      <CollapsibleBlock
        icon={<Wrench size={14} />}
        title={title}
        content={displayContent}
        loading={!toolResult}
        variant={isError ? 'red' : 'blue'}
      />
    );
  },
);
