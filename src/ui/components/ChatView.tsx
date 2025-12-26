import { Box, useStdout } from 'ink';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { runConversation } from '../../services/chatOrchestrator';
import { getCurrentModel, loadAppConfig } from '../../services/configManager';
import { addUserMessage, saveSession } from '../../services/sessionManager';
import { useChatStore } from '../../store/chatStore';

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
    error,
    setSession,
    updateSessionTokens,
    updateMessages,
    setLoading,
    setError,
  } = useChatStore(
    useShallow(state => ({
      session: state.session,
      messages: state.messages,
      isLoading: state.isLoading,
      error: state.error,
      setSession: state.setSession,
      updateSessionTokens: state.updateSessionTokens,
      updateMessages: state.updateMessages,
      setLoading: state.setLoading,
      setError: state.setError,
    })),
  );
  const [showMenu, setShowMenu] = useState(false);
  const [model, setModel] = useState(() => getCurrentModel());
  const [enableThinking, setEnableThinking] = useState(() => loadAppConfig().enableThinking);
  const [specialistMode, setSpecialistMode] = useState(() => loadAppConfig().specialistMode);
  const [streamingOutput, setStreamingOutput] = useState(() => loadAppConfig().streamingOutput);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;
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
    setModel(getCurrentModel());
    const config = loadAppConfig();
    setEnableThinking(config.enableThinking);
    setSpecialistMode(config.specialistMode);
    setStreamingOutput(config.streamingOutput);
  }, []);

  const handleSubmit = useCallback(async (text: string) => {
    if (useChatStore.getState().isLoading) return;

    if (!model) return;

    updateMessages(messages => [...messages, {role: 'user', content: text, timestamp: Date.now()}]);
    setLoading(true);

    const updatedSession = addUserMessage(sessionRef.current, text, model.provider);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const toolFilter = {
      excludeAgents: !specialistMode,
      excludeMcp: specialistMode,
      allowedTools: specialistMode ? [] : null,
      additionalTools: specialistMode ? null : ['agent_explore'],
    };

    try {
      const finalSession = await runConversation(
        updatedSession,
        {
          onSessionUpdate: session => {
            updateSessionTokens(
              session.inputTokens ?? 0,
              session.outputTokens ?? 0,
              session.cachedTokens ?? 0,
            );
          },
          onError: (errorText: string) => {
            setError(errorText);
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
            updateMessages(
              messages => [...messages, {
                role: 'tool_call',
                content: JSON.stringify(toolCall.input),
                timestamp: Date.now(),
                toolName: toolCall.name,
                toolCallId: toolCall.id,
              }]
            );
          },
          onToolResult: toolResult => {
            updateMessages(
              messages => [...messages, {
                role: 'tool_result',
                content: toolResult.content,
                timestamp: Date.now(),
                toolName: toolResult.name,
                toolCallId: toolResult.id,
              }]
            );
          },
        },
        abortController.signal,
        toolFilter,
      );

      setSession(finalSession);
      saveSession(finalSession, model.provider);
    } finally {
      setLoading(false);
    }
  }, [model, specialistMode, updateMessages, setLoading, setSession, setError]);

  return (
    <Box flexDirection='column' paddingLeft={1} paddingRight={2} paddingY={1}>
      <MessageList
        messages={messages}
        sessionId={session.id}
        isLoading={isLoading}
        streamingOutput={streamingOutput}
        error={error}
      />

      <Box height={1} marginBottom={1}>{isLoading && <LoadingIndicator />}</Box>

      {showMenu && <Menu onClose={handleCloseMenu} />}

      {!showMenu && (
        <>
          <StatusBar
            isLoading={isLoading}
            onInterrupt={handleInterrupt}
            onOpenMenu={handleOpenMenu}
            model={model}
            session={session}
            enableThinking={enableThinking}
            specialistMode={specialistMode}
          />
          <InputBox onSubmit={handleSubmit} disabled={isLoading} />
        </>
      )}
    </Box>
  );
}
