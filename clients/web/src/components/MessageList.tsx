import { AlertCircle, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { LoadingIndicator } from './LoadingIndicator';
import { MessageActionBar } from './MessageActionBar';
import { MessageItem } from './MessageItem';

const SCROLL_THRESHOLD = 150;

const emptyStateSubtitle: Record<string, string> = {
  artist: 'Ready to bring your ideas to life visually. Pick a model in settings to get started.',
  explorer: 'Ready to help you research and discover. Pick a model in settings to get started.',
  assistant: 'Ready to help with whatever you need. Pick a model in settings to get started.',
};
const defaultSubtitle =
  'Ready to help with your coding tasks. Pick a model in settings to get started.';

export default function MessageList() {
  const {currentSession, isLoading, isCompacting, error, config} = useChatStore();
  const messages = currentSession?.messages ?? [];
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevSessionIdRef = useRef(currentSession?.id);
  const checkIfNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;
    const {scrollTop, scrollHeight, clientHeight} = container;
    return scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
  }, []);

  const handleScroll = useCallback(() => {
    isNearBottomRef.current = checkIfNearBottom();
  }, [checkIfNearBottom]);

  useEffect(() => {
    if (isLoading) {
      isNearBottomRef.current = true;
      const container = scrollContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [isLoading]);

  useEffect(() => {
    const sessionChanged = prevSessionIdRef.current !== currentSession?.id;
    prevSessionIdRef.current = currentSession?.id;

    const container = scrollContainerRef.current;
    if (!container) return;

    if (sessionChanged) {
      isNearBottomRef.current = true;
      container.scrollTop = container.scrollHeight;
      return;
    }

    if (isNearBottomRef.current) {
      container.scrollTo({top: container.scrollHeight, behavior: 'smooth'});
    }
  }, [currentSession?.id, messages]);

  const showActionBar = !isLoading && messages.length > 0
    && messages[messages.length - 1].role !== 'user';

  let lastAssistantContent = '';
  if (showActionBar) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') break;
      if (messages[i].role === 'assistant' && messages[i].content.trim()) {
        lastAssistantContent = messages[i].content;
        break;
      }
    }
  }

  const handleRetry = async () => {
    const {getRewindPoints, rewind, sendMessage} = useChatStore.getState();
    const points = await getRewindPoints();
    if (points.length === 0) return;
    await rewind(points[0].index);
    await sendMessage(points[0].label);
  };

  const handleRewind = async () => {
    const {getRewindPoints, rewind} = useChatStore.getState();
    const points = await getRewindPoints();
    if (points.length > 0) await rewind(points[0].index);
  };

  if (messages.length === 0) {
    return (
      <div className='flex-1 flex flex-col items-center justify-center text-vscode-text-muted p-8'>
        <Sparkles size={48} className='opacity-40 mb-6' />
        <h3 className='text-lg font-medium text-vscode-text mb-2'>OmniContext</h3>
        <p className='text-center max-w-sm text-sm opacity-80'>
          {emptyStateSubtitle[config?.workflowPreset ?? ''] ?? defaultSubtitle}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className='flex-1 overflow-y-auto overscroll-contain px-4 [scrollbar-gutter:stable_both-edges]'
    >
      <div className='max-w-4xl mx-auto py-6 space-y-4'>
        {messages.map((message, index) => (
          <MessageItem
            key={`${message.timestamp}-${index}`}
            message={message}
            isLoading={isLoading && index === messages.length - 1}
          />
        ))}
        {showActionBar && (
          <MessageActionBar
            content={lastAssistantContent}
            onRetry={handleRetry}
            onRewind={handleRewind}
          />
        )}
        {isLoading && <LoadingIndicator compacting={isCompacting} />}
        {error && (
          <div className='flex items-center gap-3 px-4 py-2.5 bg-vscode-error/10 border border-vscode-error/50 rounded-md text-vscode-text'>
            <AlertCircle size={14} className='shrink-0 text-vscode-error' />
            <div className='text-sm'>{error}</div>
          </div>
        )}
        <div className='h-4' />
      </div>
    </div>
  );
}
