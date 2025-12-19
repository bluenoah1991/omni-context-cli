import { Box, useStdout } from 'ink';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { runConversation } from '../../services/chatOrchestrator';
import { getAppConfig } from '../../services/configManager';
import { addUserMessage, saveSession } from '../../services/sessionManager';
import { useChatStore } from '../../store/chatStore';
import { PendingToolCall } from '../../types/tool';
import { InputBox } from './InputBox';
import { LoadingIndicator } from './LoadingIndicator';
import { Menu } from './Menu';
import { MessageList } from './MessageList';
import { StatusBar } from './StatusBar';

export function ChatView(): React.ReactElement {
  const {
    session,
    messages,
    isLoading,
    setSession,
    updateSessionTokens,
    updateMessages,
    setLoading,
  } = useChatStore(
    useShallow(state => ({
      session: state.session,
      messages: state.messages,
      isLoading: state.isLoading,
      setSession: state.setSession,
      updateSessionTokens: state.updateSessionTokens,
      updateMessages: state.updateMessages,
      setLoading: state.setLoading,
    })),
  );
  const [showMenu, setShowMenu] = useState(false);
  const [config, setConfig] = useState(() => getAppConfig());
  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const pendingToolCallsRef = useRef<Map<string, PendingToolCall>>(new Map());
  const {stdout} = useStdout();

  useEffect(() => {
    const isVSCode = process.env.TERM_PROGRAM === 'vscode';
    const isWindows = process.platform === 'win32';

    if (stdout && isWindows && isVSCode) {
      stdout.write('\x1B[?25h');
    }
  }, [stdout]);

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

    updateMessages(messages => [...messages, {role: 'user', content: text, timestamp: Date.now()}]);
    setLoading(true);

    const updatedSession = addUserMessage(sessionRef.current, text, config.provider);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const finalSession = await runConversation(updatedSession, {
        onSessionUpdate: session => {
          updateSessionTokens(
            session.inputTokens ?? 0,
            session.outputTokens ?? 0,
            session.cachedTokens ?? 0,
          );
        },
        onContent: (content: string) => {
          updateMessages(messages => {
            const last = messages[messages.length - 1];
            if (last?.role === 'assistant') {
              return [...messages.slice(0, -1), {...last, content: last.content + content}];
            }
            return [...messages, {role: 'assistant', content, timestamp: Date.now()}];
          });
        },
        onThinking: (thinking: string) => {
          updateMessages(messages => {
            const last = messages[messages.length - 1];
            if (last?.role === 'thinking') {
              return [...messages.slice(0, -1), {...last, content: last.content + thinking}];
            }
            return [...messages, {role: 'thinking', content: thinking, timestamp: Date.now()}];
          });
        },
        onToolCall: toolCall => {
          pendingToolCallsRef.current.set(toolCall.id, {
            content: JSON.stringify(toolCall.input),
            timestamp: Date.now(),
            toolName: toolCall.name,
          });
        },
        onToolResult: toolResult => {
          const pendingCall = pendingToolCallsRef.current.get(toolResult.id);
          if (pendingCall) {
            pendingToolCallsRef.current.delete(toolResult.id);
            updateMessages(
              messages => [...messages, {
                role: 'tool_call',
                content: pendingCall.content,
                timestamp: pendingCall.timestamp,
                toolName: pendingCall.toolName,
                toolCallId: toolResult.id,
                toolResult: toolResult.content,
              }]
            );
          }
        },
      }, abortController.signal);

      setSession(finalSession);
      saveSession(finalSession, config.provider);
    } finally {
      pendingToolCallsRef.current.clear();
      setLoading(false);
    }
  }, [config.provider, updateMessages, setLoading, setSession]);

  return (
    <Box flexDirection='column' padding={1}>
      <MessageList
        messages={messages}
        sessionId={session.id}
        isLoading={isLoading}
        streamingOutput={config.streamingOutput ?? false}
      />

      <Box height={1} marginBottom={1}>{isLoading && <LoadingIndicator />}</Box>

      {showMenu && <Menu onClose={handleCloseMenu} />}

      {!showMenu && (
        <>
          <StatusBar
            isLoading={isLoading}
            onInterrupt={handleInterrupt}
            onOpenMenu={handleOpenMenu}
            config={config}
            session={session}
          />
          <InputBox onSubmit={handleSubmit} disabled={isLoading} />
        </>
      )}
    </Box>
  );
}
