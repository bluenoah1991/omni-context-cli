import {
  Bot,
  Download,
  FilePlus,
  FileText,
  FolderSearch,
  Globe,
  Plug,
  Search,
  Sparkles,
  SquarePen,
  Terminal,
  Wrench,
} from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useChatStore } from '../store/chatStore';
import type { FileDiff } from '../types/uiMessage';
import { CollapsibleBlock } from './CollapsibleBlock';
import { DiffContent } from './DiffView';

type Variant = 'muted' | 'blue' | 'red' | 'green';

const toolAppearanceMap: Record<string, {Icon: typeof Wrench; variant: Variant;}> = {
  Bash: {Icon: Terminal, variant: 'blue'},
  BashOutput: {Icon: Terminal, variant: 'blue'},
  Edit: {Icon: SquarePen, variant: 'blue'},
  Glob: {Icon: FolderSearch, variant: 'blue'},
  Grep: {Icon: Search, variant: 'blue'},
  Read: {Icon: FileText, variant: 'blue'},
  Write: {Icon: FilePlus, variant: 'blue'},
  SaveArtifact: {Icon: Download, variant: 'blue'},
  WebFetch: {Icon: Globe, variant: 'green'},
  WebSearch: {Icon: Globe, variant: 'green'},
  Skill: {Icon: Sparkles, variant: 'blue'},
};

function getToolAppearance(toolName: string, hasDiffs: boolean) {
  const mapped = toolAppearanceMap[toolName];
  if (mapped) {
    const Icon = hasDiffs ? SquarePen : mapped.Icon;
    return {icon: <Icon size={14} />, variant: mapped.variant};
  }
  if (toolName.startsWith('agent_')) {
    const Icon = hasDiffs ? SquarePen : Bot;
    return {icon: <Icon size={14} />, variant: 'blue' as Variant};
  }
  if (toolName.startsWith('mcp_')) {
    const Icon = hasDiffs ? SquarePen : Plug;
    return {icon: <Icon size={14} />, variant: 'blue' as Variant};
  }
  const Icon = hasDiffs ? SquarePen : Wrench;
  return {icon: <Icon size={14} />, variant: 'blue' as Variant};
}

interface ToolCallBlockProps {
  toolName: string;
  toolInput?: string;
  toolCallId?: string;
  toolResult?: string;
}

function getFileName(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || filePath;
}

export const ToolCallBlock = memo(
  function ToolCallBlock({toolName, toolInput, toolCallId, toolResult}: ToolCallBlockProps) {
    const openDiffPanel = useChatStore(state => state.openDiffPanel);
    const toolExpanded = useChatStore(state => state.toolExpanded);
    const inlineDiff = useChatStore(state => state.inlineDiff);

    const {displayContent, isError, diffs} = useMemo(() => {
      if (!toolResult) {
        return {displayContent: '', isError: false, diffs: null};
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

    const title = toolInput || toolName;
    const hasDiffs = diffs && diffs.length > 0;
    const showInline = hasDiffs && inlineDiff;

    const {icon, variant: toolVariant} = getToolAppearance(toolName, !!hasDiffs);
    const variant = isError ? 'red' : toolVariant;

    return (
      <div
        onClick={hasDiffs && !inlineDiff ? handleClick : undefined}
        className={hasDiffs && !inlineDiff ? 'cursor-pointer' : ''}
      >
        <CollapsibleBlock
          icon={icon}
          title={title}
          content={showInline ? undefined : displayContent}
          loading={!toolResult}
          defaultExpanded={toolExpanded}
          variant={variant}
          clickable={hasDiffs && !inlineDiff || false}
        >
          {showInline && diffs.map((diff, i) => (
            <div key={i}>
              <div className='h-px bg-white/5 light:bg-black/10' />
              <div className='flex items-center gap-2 px-4 py-2.5 text-xs text-vscode-text-muted font-mono border-b border-vscode-element'>
                <span className='font-medium truncate' title={diff.filePath}>
                  {getFileName(diff.filePath)}
                </span>
                <span className='opacity-50 truncate hidden sm:inline'>{diff.filePath}</span>
              </div>
              <div className='max-h-80 overflow-auto'>
                <DiffContent patch={diff.patch} />
              </div>
            </div>
          ))}
        </CollapsibleBlock>
      </div>
    );
  },
);
