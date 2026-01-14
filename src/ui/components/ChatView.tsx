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
import { injectProjectInstructions } from '../../services/projectInstructionsManager';
import { addUserMessage, createSession, saveSession } from '../../services/sessionManager';
import { parseSlashCommand } from '../../services/slashManager';
import { useChatStore } from '../../store/chatStore';
import { useIDEStore } from '../../store/ideStore';
import { wrapDualMessage, wrapIDEContext } from '../../utils/messagePreprocessor';

import { CompactingIndicator } from './CompactingIndicator';
import { IDEContextBar } from './IDEContextBar';
import { InputBox } from './InputBox';
import { LoadingIndicator } from './LoadingIndicator';
import { MediaContextBar } from './MediaContextBar';
import { Menu, View } from './Menu';
import { MessageList } from './MessageList';
import { StatusBar } from './StatusBar';

export function ChatView(): React.ReactElement {
  const {
    session,
    messages,
    isLoading,
    isCompacting,
    error,
    mediaContexts,
    setSession,
    updateSessionTokens,
    updateMessages,
    setLoading,
    setCompacting,
    setError,
    clearMediaContexts,
  } = useChatStore(
    useShallow(state => ({
      session: state.session,
      messages: state.messages,
      isLoading: state.isLoading,
      isCompacting: state.isCompacting,
      error: state.error,
      mediaContexts: state.mediaContexts,
      setSession: state.setSession,
      updateSessionTokens: state.updateSessionTokens,
      updateMessages: state.updateMessages,
      setLoading: state.setLoading,
      setCompacting: state.setCompacting,
      setError: state.setError,
      clearMediaContexts: state.clearMediaContexts,
    })),
  );
  const [showMenu, setShowMenu] = useState(false);
  const [menuInitialView, setMenuInitialView] = useState<View | undefined>();
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
    setMenuInitialView(undefined);
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
        setLoading(true);
        const result = await slashCommand.execute();
        setLoading(false);
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

    const menuCommands: Record<string, View> = {
      rewind: 'rewind-session',
      model: 'pick-model',
      session: 'browse-sessions',
    };
    const menuView = slashCommand?.name ? menuCommands[slashCommand.name] : undefined;
    if (menuView) {
      setMenuInitialView(menuView);
      setShowMenu(true);
      return;
    }

    const currentSelection = useIDEStore.getState().selection;
    if (ideContextEnabled && currentSelection) {
      text = wrapIDEContext(text, currentSelection);
    }

    const currentMediaContexts = useChatStore.getState().mediaContexts;
    const userMedia = currentMediaContexts.length > 0
      ? currentMediaContexts.map(m => ({dataUrl: m.dataUrl, mimeType: m.mimeType}))
      : undefined;
    if (currentMediaContexts.length > 0) {
      clearMediaContexts();
    }

    let sessionToRun = sessionRef.current;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    if (slashCommand?.name === 'compact' || shouldAutoCompact(model, sessionRef.current)) {
      updateMessages(
        messages => [...messages, {role: 'user', content: text, timestamp: Date.now()}]
      );
      setCompacting(true);
      try {
        const [summary, playbook] = await Promise.all([
          generateSummary(model, sessionRef.current.messages, abortController.signal),
          playbookEnabled
            ? generatePlaybook(model, sessionRef.current, abortController.signal)
            : Promise.resolve(undefined),
        ]);

        if (abortController.signal.aborted) {
          setError('Compaction cancelled');
          return;
        }

        sessionToRun = createSession(model);
        if (playbookEnabled) {
          sessionToRun = injectPlaybook(sessionToRun, model.provider, playbook);
        }
        sessionToRun = injectProjectInstructions(sessionToRun, model.provider);
        sessionToRun = injectSummary(sessionToRun, summary, model.provider);

        if (slashCommand?.name !== 'compact') {
          sessionToRun = addUserMessage(sessionToRun, text, model.provider, userMedia);
        }
        process.stdout.write('\x1Bc');
        setSession(sessionToRun);

        if (slashCommand?.name === 'compact') {
          return;
        }
      } catch (error) {
        setError(`Compaction failed: ${error}`);
        return;
      } finally {
        setCompacting(false);
      }
    } else {
      if (sessionRef.current.messages.length === 0) {
        if (playbookEnabled) {
          sessionToRun = injectPlaybook(sessionToRun, model.provider);
        }
        sessionToRun = injectProjectInstructions(sessionToRun, model.provider);
      }
      sessionToRun = addUserMessage(sessionToRun, text, model.provider, userMedia);
      setSession(sessionToRun);
    }

    const toolFilter = {
      excludeAgents: !specialistMode,
      excludeMcp: specialistMode,
      allowedTools: specialistMode ? [] : null,
      additionalTools: specialistMode ? null : ['agent_explore'],
    };

    setLoading(true);

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
    updateSessionTokens,
    setLoading,
    setCompacting,
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
        {isCompacting
          ? <CompactingIndicator />
          : isLoading && <LoadingIndicator specialistMode={specialistMode} />}
      </Box>

      {showMenu && <Menu onClose={handleCloseMenu} initialView={menuInitialView} />}

      <Box display={showMenu ? 'none' : 'flex'} flexDirection='column'>
        <StatusBar
          isLoading={isLoading || isCompacting}
          onInterrupt={handleInterrupt}
          onOpenMenu={handleOpenMenu}
          model={model}
          session={session}
          enableThinking={enableThinking}
          disabled={showMenu}
        />
        <InputBox onSubmit={handleSubmit} disabled={isLoading || isCompacting || showMenu} />
        <Box flexDirection='row' gap={2}>
          {ideContextEnabled && <IDEContextBar selection={ideSelection} />}
          <MediaContextBar mediaContexts={mediaContexts} />
        </Box>
      </Box>
    </Box>
  );
}
