import { AlertCircle, MessageSquare } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { LoadingIndicator } from './LoadingIndicator';
import { MessageItem } from './MessageItem';

export default function MessageList() {
  const {currentSession, isLoading, isCompacting, error} = useChatStore();
  const messages = currentSession?.messages ?? [];
  const scrollTargetRef = useRef<HTMLDivElement>(null);
  const prevLoadingRef = useRef(isLoading);

  useEffect(() => {
    const isLoadingJustEnded = prevLoadingRef.current && !isLoading;
    prevLoadingRef.current = isLoading;

    if (isLoadingJustEnded) {
      setTimeout(() => {
        scrollTargetRef.current?.scrollIntoView({behavior: 'smooth'});
      }, 300);
    }
  }, [isLoading]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'user') {
      scrollTargetRef.current?.scrollIntoView({behavior: 'smooth'});
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className='flex-1 flex flex-col items-center justify-center text-vscode-text-muted p-8'>
        <div className='w-16 h-16 bg-vscode-element rounded-full flex items-center justify-center mb-6'>
          <MessageSquare size={32} className='opacity-50' />
        </div>
        <h3 className='text-lg font-medium text-vscode-text mb-2'>OmniContext</h3>
        <p className='text-center max-w-sm text-sm opacity-80'>
          Ready to help with your coding tasks. Pick a model in settings to get started.
        </p>
      </div>
    );
  }

  const lastRole = messages[messages.length - 1]?.role;
  const showLoading = isLoading && lastRole !== 'thinking' && lastRole !== 'tool_call';

  return (
    <div className='flex-1 overflow-y-auto px-4 [scrollbar-gutter:stable_both-edges]'>
      <div className='max-w-4xl mx-auto py-6 space-y-6'>
        {messages.map((message, index) => (
          <MessageItem
            key={`${message.timestamp}-${index}`}
            message={message}
            isLoading={isLoading && index === messages.length - 1}
          />
        ))}
        {showLoading && <LoadingIndicator compacting={isCompacting} />}
        {error && (
          <div className='flex items-center gap-3 px-4 py-2.5 bg-vscode-error/10 border border-vscode-error/50 rounded-md text-vscode-text'>
            <AlertCircle size={14} className='shrink-0 text-vscode-error' />
            <div className='text-sm'>{error}</div>
          </div>
        )}
        <div ref={scrollTargetRef} className='h-4' />
      </div>
    </div>
  );
}
