import { Box } from 'ink';
import React, { useCallback, useRef, useState } from 'react';
import { runConversation } from '../../services/chatOrchestrator';
import { getAppConfig } from '../../services/configManager';
import { addUserMessage } from '../../services/sessionManager';
import { useChatStore } from '../../store/chatStore';
import { Header } from './Header';
import { InputBox } from './InputBox';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { LoadingIndicator } from './LoadingIndicator';
import { Menu } from './Menu';
import { MessageList } from './MessageList';

type StreamBuffer = {content: string; thinking: string; flushId: NodeJS.Immediate | null;};

export function ChatView(): React.ReactElement {
  const {session, messages, isLoading, setSession, updateMessages, setLoading} = useChatStore();
  const [showMenu, setShowMenu] = useState(false);
  const [config, setConfig] = useState(() => getAppConfig());
  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const streamBufferRef = useRef<StreamBuffer>({content: '', thinking: '', flushId: null});

  const flushStreamBuffer = useCallback(() => {
    const buffer = streamBufferRef.current;
    if (!buffer.content && !buffer.thinking) return;

    const contentToAdd = buffer.content;
    const thinkingToAdd = buffer.thinking;
    buffer.content = '';
    buffer.thinking = '';
    buffer.flushId = null;

    if (contentToAdd) {
      updateMessages(msgs => {
        const last = msgs[msgs.length - 1];
        if (last?.role === 'assistant') {
          return [...msgs.slice(0, -1), {...last, content: last.content + contentToAdd}];
        }
        return [...msgs, {role: 'assistant', content: contentToAdd, timestamp: Date.now()}];
      });
    }

    if (thinkingToAdd) {
      updateMessages(msgs => {
        const last = msgs[msgs.length - 1];
        if (last?.role === 'thinking') {
          return [...msgs.slice(0, -1), {...last, content: last.content + thinkingToAdd}];
        }
        return [...msgs, {role: 'thinking', content: thinkingToAdd, timestamp: Date.now()}];
      });
    }
  }, [updateMessages]);

  const scheduleFlush = useCallback(() => {
    if (streamBufferRef.current.flushId === null) {
      streamBufferRef.current.flushId = setImmediate(flushStreamBuffer);
    }
  }, [flushStreamBuffer]);

  const handleInterrupt = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleOpenMenu = useCallback(() => {
    setShowMenu(true);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setShowMenu(false);
    setConfig(getAppConfig());
  }, []);

  const handleSubmit = useCallback(async (text: string) => {
    if (useChatStore.getState().isLoading) return;

    updateMessages(msgs => [...msgs, {role: 'user', content: text, timestamp: Date.now()}]);
    setLoading(true);

    const updatedSession = addUserMessage(sessionRef.current, text, config.provider);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const finalSession = await runConversation(updatedSession, {
        onContent: (content: string) => {
          streamBufferRef.current.content += content;
          scheduleFlush();
        },
        onThinking: (thinking: string) => {
          streamBufferRef.current.thinking += thinking;
          scheduleFlush();
        },
        onToolCall: toolCall => {
          updateMessages(
            msgs => [...msgs, {
              role: 'tool_use',
              content: JSON.stringify(toolCall.input),
              timestamp: Date.now(),
              toolName: toolCall.name,
            }]
          );
        },
        onToolResult: toolResult => {
          updateMessages(
            msgs => [...msgs, {
              role: 'tool_result',
              content: toolResult.content,
              timestamp: Date.now(),
              toolName: toolResult.name,
            }]
          );
        },
      }, abortController.signal);

      setSession(finalSession);
    } finally {
      setLoading(false);
    }
  }, [config.provider, updateMessages, setLoading, setSession, scheduleFlush]);

  return (
    <Box flexDirection='column' padding={1}>
      <Header config={config} />

      <Box flexDirection='column' flexGrow={1}>
        <MessageList messages={messages} />
      </Box>

      <Box height={1}>{isLoading && <LoadingIndicator />}</Box>

      {showMenu && <Menu onClose={handleCloseMenu} />}

      {!showMenu && (
        <Box marginTop={1}>
          <KeyboardShortcuts
            isLoading={isLoading}
            onInterrupt={handleInterrupt}
            onOpenMenu={handleOpenMenu}
          />
        </Box>
      )}

      {!showMenu && (
        <Box>
          <InputBox onSubmit={handleSubmit} disabled={isLoading} />
        </Box>
      )}
    </Box>
  );
}
