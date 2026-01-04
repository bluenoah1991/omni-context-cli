import { Box, useStdout } from 'ink';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { runConversation } from '../../services/chatOrchestrator';
import {
  generateSummary,
  injectSummary,
  shouldAutoCompact,
} from '../../services/compactionManager';
import { getCurrentModel, loadAppConfig } from '../../services/configManager';
import { generatePlaybook, injectPlaybook } from '../../services/playbookManager';
import { addUserMessage, createSession, saveSession } from '../../services/sessionManager';
import { parseSlashCommand } from '../../services/slashManager';
import { useChatStore } from '../../store/chatStore';
import { useIDEStore } from '../../store/ideStore';
import { wrapDualMessage, wrapIDEContext } from '../../utils/messagePreprocessor';

import { CompactingIndicator } from './CompactingIndicator';
import { IDEContextBar } from './IDEContextBar';
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
    isCompacting,
    error,
    setSession,
    updateSessionTokens,
    updateMessages,
    setLoading,
    setCompacting,
    setError,
  } = useChatStore(
    useShallow(state => ({
      session: state.session,
      messages: state.messages,
      isLoading: state.isLoading,
      isCompacting: state.isCompacting,
      error: state.error,
      setSession: state.setSession,
      updateSessionTokens: state.updateSessionTokens,
      updateMessages: state.updateMessages,
      setLoading: state.setLoading,
      setCompacting: state.setCompacting,
      setError: state.setError,
    })),
  );
  const [showMenu, setShowMenu] = useState(false);
  const [model, setModel] = useState(() => getCurrentModel());
  const [enableThinking, setEnableThinking] = useState(() => loadAppConfig().enableThinking);
  const [specialistMode, setSpecialistMode] = useState(() => loadAppConfig().specialistMode);
  const [streamingOutput, setStreamingOutput] = useState(() => loadAppConfig().streamingOutput);
  const [ideContextEnabled, setIDEContextEnabled] = useState(() => loadAppConfig().ideContext);
  const [playbookEnabled, setPlaybookEnabled] = useState(() => loadAppConfig().playbookEnabled);
  const ideSelection = useIDEStore(state => state.selection);
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
    setIDEContextEnabled(config.ideContext);
    setPlaybookEnabled(config.playbookEnabled);
  }, []);

  const handleSubmit = useCallback(async (text: string) => {
    if (useChatStore.getState().isLoading) return;

    if (!model) return;

    const slashCommand = parseSlashCommand(text);
    if (slashCommand) {
      if (slashCommand.type === 'functional' && slashCommand.execute) {
        updateMessages(
          messages => [...messages, {role: 'user', content: text, timestamp: Date.now()}]
        );
        const result = slashCommand.execute();
        if (result.message) {
          setError(null);
          updateMessages(
            messages => [...messages, {
              role: 'assistant',
              content: result.message!,
              timestamp: Date.now(),
            }]
          );
        }
        return;
      }
      if (slashCommand.type === 'prompt' && slashCommand.prompt) {
        text = wrapDualMessage(text, slashCommand.prompt);
      }
    }

    const currentSelection = useIDEStore.getState().selection;
    if (ideContextEnabled && currentSelection) {
      text = wrapIDEContext(text, currentSelection);
    }

    setLoading(true);

    let sessionToRun = sessionRef.current;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    if (shouldAutoCompact(model, sessionRef.current)) {
      setCompacting(true);
      try {
        const [summary, playbook] = await Promise.all([
          generateSummary(model, sessionRef.current.messages, abortController.signal),
          playbookEnabled
            ? generatePlaybook(model, sessionRef.current, abortController.signal)
            : Promise.resolve(undefined),
        ]);

        if (abortController.signal.aborted) return;

        sessionToRun = createSession(model);
        if (playbookEnabled) {
          sessionToRun = injectPlaybook(sessionToRun, model.provider, playbook);
        }
        sessionToRun = injectSummary(sessionToRun, summary, model.provider);
        sessionToRun = addUserMessage(sessionToRun, text, model.provider);
        process.stdout.write('\x1Bc');
        setSession(sessionToRun);
      } catch (error) {
        setError(`Compaction failed: ${error}`);
        setLoading(false);
        return;
      } finally {
        setCompacting(false);
      }
    } else {
      if (sessionRef.current.messages.length === 0 && playbookEnabled) {
        sessionToRun = injectPlaybook(sessionToRun, model.provider);
      }
      sessionToRun = addUserMessage(sessionToRun, text, model.provider);
      setSession(sessionToRun);
    }

    const toolFilter = {
      excludeAgents: !specialistMode,
      excludeMcp: specialistMode,
      allowedTools: specialistMode ? [] : null,
      additionalTools: specialistMode ? null : ['agent_explore'],
    };

    try {
      const finalSession = await runConversation(
        sessionToRun,
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
  }, [
    model,
    specialistMode,
    ideContextEnabled,
    playbookEnabled,
    updateMessages,
    setLoading,
    setSession,
    setError,
  ]);

  return (
    <Box flexDirection='column' paddingLeft={1} paddingRight={2} paddingY={1}>
      <MessageList
        messages={messages}
        sessionId={session.id}
        isLoading={isLoading}
        streamingOutput={streamingOutput}
        error={error}
      />

      <Box height={2}>
        {isCompacting ? <CompactingIndicator /> : isLoading && <LoadingIndicator />}
      </Box>

      {showMenu && <Menu onClose={handleCloseMenu} />}

      <Box display={showMenu ? 'none' : 'flex'} flexDirection='column'>
        <StatusBar
          isLoading={isLoading}
          onInterrupt={handleInterrupt}
          onOpenMenu={handleOpenMenu}
          model={model}
          session={session}
          enableThinking={enableThinking}
          specialistMode={specialistMode}
          disabled={showMenu}
        />
        <InputBox onSubmit={handleSubmit} disabled={isLoading || showMenu} />
        {ideContextEnabled && <IDEContextBar selection={ideSelection} />}
      </Box>
    </Box>
  );
}
