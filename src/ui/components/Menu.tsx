import { Box } from 'ink';
import React, { useState } from 'react';
import {
  addModel,
  getAgentModel,
  getCurrentModel,
  loadAppConfig,
  removeModel,
  setAgentModel,
  setCacheTtl,
  setCurrentModel,
  setDefaultModel,
  setIDEContext,
  setPlaybookEnabled,
  setSpecialistMode,
  setStreamingOutput,
  setThinking,
} from '../../services/configManager';
import {
  getRewindPoints,
  listSessions,
  loadSession,
  saveSession,
  truncateSession,
} from '../../services/sessionManager';
import { useChatStore } from '../../store/chatStore';
import { Provider } from '../../types/config';
import { colors } from '../theme/colors';
import { SelectItem, SelectList } from './SelectList';
import { FormStep, StepForm } from './StepForm';

export type View =
  | 'main'
  | 'pick-model'
  | 'model-ops'
  | 'add-model'
  | 'default-model'
  | 'agent-model'
  | 'remove-model'
  | 'prefs'
  | 'pref-thinking'
  | 'pref-streaming'
  | 'pref-specialist'
  | 'pref-ide-context'
  | 'pref-playbook'
  | 'pref-cache-ttl'
  | 'browse-sessions'
  | 'rewind-session';

function normalizeApiUrl(url: string, provider: Provider): string {
  let apiUrl = url.trim();
  if (!apiUrl) return '';

  apiUrl = apiUrl.replace(/\/+$/, '');

  if (provider === 'anthropic') {
    if (!apiUrl.endsWith('/v1/messages')) {
      apiUrl = `${apiUrl}/v1/messages`;
    }
  } else if (provider === 'openai') {
    if (!apiUrl.endsWith('/chat/completions')) {
      apiUrl = `${apiUrl}/chat/completions`;
    }
  }

  return apiUrl;
}

interface MenuProps {
  onClose: () => void;
  initialView?: View;
}

export function Menu({onClose, initialView}: MenuProps): React.ReactElement {
  const [view, setView] = useState<View>(initialView ?? 'main');
  const [mainIndex, setMainIndex] = useState(0);
  const [selectIndex, setSelectIndex] = useState(0);
  const [setDefaultIndex, setSetDefaultIndex] = useState<number>();
  const [agentModelIndex, setAgentModelIndex] = useState<number>();
  const [deleteIndex, setDeleteIndex] = useState(0);
  const [thinkingIndex, setThinkingIndex] = useState<number>();
  const [streamingIndex, setStreamingIndex] = useState<number>();
  const [specialistIndex, setSpecialistIndex] = useState<number>();
  const [ideContextIndex, setIDEContextIndex] = useState<number>();
  const [playbookIndex, setPlaybookIndex] = useState<number>();
  const [cacheTtlIndex, setCacheTtlIndex] = useState<number>();
  const [sessionsIndex, setSessionsIndex] = useState(0);
  const [rewindIndex, setRewindIndex] = useState(0);
  const [modelsIndex, setModelsIndex] = useState(0);
  const [settingsIndex, setSettingsIndex] = useState(0);

  const config = loadAppConfig();

  if (view === 'main') {
    const items: SelectItem[] = [
      {id: 'select', label: '⤭ Switch to a different model'},
      {id: 'sessions', label: '↻ Load a previous session'},
      {id: 'rewind', label: '↩ Rewind to a previous message'},
      {id: 'specialist', label: '♪ Specialist mode on/off'},
      {id: 'models', label: '◈ Manage your model list →'},
      {id: 'settings', label: '⚙ Change your preferences →'},
      {id: 'exit', label: '× Quit Omx'},
    ];

    const viewMap: View[] = [
      'pick-model',
      'browse-sessions',
      'rewind-session',
      'pref-specialist',
      'model-ops',
      'prefs',
    ];

    return (
      <Box
        flexDirection='column'
        borderStyle='round'
        borderColor={colors.primary}
        paddingX={2}
        paddingY={1}
      >
        <SelectList
          key='main-menu'
          title='What would you like to do?'
          items={items}
          selectedIndex={mainIndex}
          onSelect={setMainIndex}
          onConfirm={i => {
            if (i === 6) process.exit(0);
            else setView(viewMap[i]);
          }}
          onCancel={onClose}
        />
      </Box>
    );
  }

  if (view === 'model-ops') {
    const items: SelectItem[] = [
      {id: 'add', label: '+ Add a new model'},
      {id: 'default', label: '★ Change the default model'},
      {id: 'agent-model', label: '◈ Change the agent model'},
      {id: 'delete', label: '− Remove a model'},
    ];

    const viewMap: View[] = ['add-model', 'default-model', 'agent-model', 'remove-model'];

    return (
      <Box
        flexDirection='column'
        borderStyle='round'
        borderColor={colors.primary}
        paddingX={2}
        paddingY={1}
      >
        <SelectList
          key='models-menu'
          title='What would you like to change about your models?'
          items={items}
          selectedIndex={modelsIndex}
          onSelect={setModelsIndex}
          onConfirm={i => setView(viewMap[i])}
          onCancel={() => setView('main')}
        />
      </Box>
    );
  }

  if (view === 'prefs') {
    const items: SelectItem[] = [
      {id: 'thinking', label: '◉ Extended thinking'},
      {id: 'streaming', label: '⇵ Streaming output'},
      {id: 'ide-context', label: '⌘ IDE context'},
      {id: 'playbook', label: '≡ Playbook memory'},
      {id: 'cache-ttl', label: '⏱ Cache duration'},
    ];

    const viewMap: View[] = [
      'pref-thinking',
      'pref-streaming',
      'pref-ide-context',
      'pref-playbook',
      'pref-cache-ttl',
    ];

    return (
      <Box
        flexDirection='column'
        borderStyle='round'
        borderColor={colors.primary}
        paddingX={2}
        paddingY={1}
      >
        <SelectList
          key='settings-menu'
          title='Anything to tweak?'
          items={items}
          selectedIndex={settingsIndex}
          onSelect={setSettingsIndex}
          onConfirm={i => setView(viewMap[i])}
          onCancel={() => setView('main')}
        />
      </Box>
    );
  }

  if (view === 'pick-model') {
    const items: SelectItem[] = config.models.map(m => ({id: m.id, label: m.nickname}));

    return (
      <Box
        flexDirection='column'
        borderStyle='round'
        borderColor={colors.primary}
        paddingX={2}
        paddingY={1}
      >
        <SelectList
          key='select-model'
          title='Which model should Omx use now?'
          items={items}
          selectedIndex={selectIndex}
          onSelect={setSelectIndex}
          onConfirm={i => {
            if (config.models[i]) {
              setCurrentModel(config.models[i]);
              onClose();
            }
          }}
          onCancel={() => setView('main')}
          emptyMessage='No models configured yet. Add one first!'
        />
      </Box>
    );
  }

  if (view === 'add-model') {
    const steps: FormStep[] = [
      {
        type: 'select',
        key: 'provider',
        label: 'API Type',
        options: [{value: 'anthropic', label: 'Anthropic'}, {value: 'openai', label: 'OpenAI'}, {
          value: 'gemini',
          label: 'Gemini',
        }],
      },
      {type: 'text', key: 'model', label: 'Model Name', placeholder: 'e.g. deepseek-chat'},
      {type: 'text', key: 'apiKey', label: 'API Key', mask: true},
      {type: 'text', key: 'apiUrl', label: 'API URL', placeholder: 'e.g. https://api.deepseek.com'},
      {
        type: 'text',
        key: 'contextSize',
        label: 'Context Size (K)',
        placeholder: 'e.g. 200 for 200K',
      },
      {
        type: 'text',
        key: 'nickname',
        label: 'Nickname',
        placeholder: 'Display name for this model',
      },
    ];

    return (
      <Box
        flexDirection='column'
        borderStyle='round'
        borderColor={colors.primary}
        paddingX={2}
        paddingY={1}
      >
        <StepForm
          steps={steps}
          initialValues={{
            provider: 'anthropic',
            model: '',
            apiKey: '',
            apiUrl: '',
            contextSize: '',
            nickname: '',
          }}
          onSubmit={values => {
            const provider = values.provider as Provider;
            addModel({
              name: values.model,
              nickname: values.nickname,
              provider,
              apiKey: values.apiKey,
              apiUrl: normalizeApiUrl(values.apiUrl, provider),
              contextSize: parseInt(values.contextSize, 10) || 200,
            });
            onClose();
          }}
          onCancel={() => setView('model-ops')}
        />
      </Box>
    );
  }

  if (view === 'default-model') {
    const items: SelectItem[] = config.models.map(m => ({
      id: m.id,
      label: m.nickname,
      hint: m.id === config.defaultModelId ? ' [default]' : undefined,
    }));
    const defaultIndex = config.defaultModelId
      ? config.models.findIndex(m => m.id === config.defaultModelId)
      : 0;
    const initialIndex = defaultIndex >= 0 ? defaultIndex : 0;

    return (
      <Box
        flexDirection='column'
        borderStyle='round'
        borderColor={colors.primary}
        paddingX={2}
        paddingY={1}
      >
        <SelectList
          key='set-default'
          title='Which model should be the default?'
          items={items}
          selectedIndex={setDefaultIndex ?? initialIndex}
          onSelect={setSetDefaultIndex}
          onConfirm={i => {
            if (config.models[i]) {
              setDefaultModel(config.models[i].id);
              onClose();
            }
          }}
          onCancel={() => setView('model-ops')}
          emptyMessage='No models configured yet. Add one first!'
        />
      </Box>
    );
  }

  if (view === 'agent-model') {
    const items: SelectItem[] = config.models.map(m => ({
      id: m.id,
      label: m.nickname,
      hint: m.id === config.agentModelId ? ' [agent]' : undefined,
    }));
    const agentModel = getAgentModel(config);
    const currentIndex = agentModel ? config.models.findIndex(m => m.id === agentModel.id) : 0;
    const initialIndex = currentIndex >= 0 ? currentIndex : 0;

    return (
      <Box
        flexDirection='column'
        borderStyle='round'
        borderColor={colors.primary}
        paddingX={2}
        paddingY={1}
      >
        <SelectList
          key='agent-model'
          title='Which model should agents use?'
          items={items}
          selectedIndex={agentModelIndex ?? initialIndex}
          onSelect={setAgentModelIndex}
          onConfirm={i => {
            if (config.models[i]) {
              setAgentModel(config.models[i].id);
              onClose();
            }
          }}
          onCancel={() => setView('model-ops')}
          emptyMessage='No models configured yet. Add one first!'
        />
      </Box>
    );
  }

  if (view === 'remove-model') {
    const items: SelectItem[] = config.models.map(m => ({id: m.id, label: m.nickname}));

    return (
      <Box
        flexDirection='column'
        borderStyle='round'
        borderColor={colors.primary}
        paddingX={2}
        paddingY={1}
      >
        <SelectList
          key='delete-model'
          title='Which model do you want to remove?'
          items={items}
          selectedIndex={deleteIndex}
          onSelect={setDeleteIndex}
          onConfirm={i => {
            if (config.models[i]) {
              removeModel(config.models[i].id);
              onClose();
            }
          }}
          onCancel={() => setView('model-ops')}
          emptyMessage='No models to remove'
        />
      </Box>
    );
  }

  if (view === 'pref-thinking') {
    const items: SelectItem[] = [{id: 'on', label: '✓ Enable thinking mode'}, {
      id: 'off',
      label: '✗ Disable thinking mode',
    }];
    const initialIndex = config.enableThinking ? 0 : 1;

    return (
      <Box
        flexDirection='column'
        borderStyle='round'
        borderColor={colors.primary}
        paddingX={2}
        paddingY={1}
      >
        <SelectList
          key='thinking-mode'
          title='Enable extended thinking for complex tasks?'
          items={items}
          selectedIndex={thinkingIndex ?? initialIndex}
          onSelect={setThinkingIndex}
          onConfirm={i => {
            const shouldEnable = i === 0;
            if (shouldEnable !== config.enableThinking) {
              setThinking(shouldEnable);
            }
            onClose();
          }}
          onCancel={() => setView('prefs')}
        />
      </Box>
    );
  }

  if (view === 'pref-streaming') {
    const items: SelectItem[] = [{id: 'on', label: '✓ Enable streaming output'}, {
      id: 'off',
      label: '✗ Disable streaming output',
    }];
    const initialIndex = config.streamingOutput ? 0 : 1;

    return (
      <Box
        flexDirection='column'
        borderStyle='round'
        borderColor={colors.primary}
        paddingX={2}
        paddingY={1}
      >
        <SelectList
          key='streaming-mode'
          title='Enable streaming output for responses?'
          items={items}
          selectedIndex={streamingIndex ?? initialIndex}
          onSelect={setStreamingIndex}
          onConfirm={i => {
            const shouldEnable = i === 0;
            if (shouldEnable !== config.streamingOutput) {
              setStreamingOutput(shouldEnable);
            }
            onClose();
          }}
          onCancel={() => setView('prefs')}
        />
      </Box>
    );
  }

  if (view === 'pref-specialist') {
    const items: SelectItem[] = [{id: 'on', label: '✓ Enable specialist mode'}, {
      id: 'off',
      label: '✗ Disable specialist mode',
    }];
    const initialIndex = config.specialistMode ? 0 : 1;

    return (
      <Box
        flexDirection='column'
        borderStyle='round'
        borderColor={colors.primary}
        paddingX={2}
        paddingY={1}
      >
        <SelectList
          key='specialist-mode'
          title='Enable specialist mode for hierarchical agent workflow?'
          items={items}
          selectedIndex={specialistIndex ?? initialIndex}
          onSelect={setSpecialistIndex}
          onConfirm={i => {
            const shouldEnable = i === 0;
            if (shouldEnable !== config.specialistMode) {
              setSpecialistMode(shouldEnable);
            }
            onClose();
          }}
          onCancel={() => setView('main')}
        />
      </Box>
    );
  }

  if (view === 'pref-ide-context') {
    const items: SelectItem[] = [{id: 'on', label: '✓ Enable IDE context'}, {
      id: 'off',
      label: '✗ Disable IDE context',
    }];
    const initialIndex = config.ideContext !== false ? 0 : 1;

    return (
      <Box
        flexDirection='column'
        borderStyle='round'
        borderColor={colors.primary}
        paddingX={2}
        paddingY={1}
      >
        <SelectList
          key='ide-context-mode'
          title='Include IDE selection context in messages?'
          items={items}
          selectedIndex={ideContextIndex ?? initialIndex}
          onSelect={setIDEContextIndex}
          onConfirm={i => {
            const shouldEnable = i === 0;
            const currentValue = config.ideContext !== false;
            if (shouldEnable !== currentValue) {
              setIDEContext(shouldEnable);
            }
            onClose();
          }}
          onCancel={() => setView('prefs')}
        />
      </Box>
    );
  }

  if (view === 'pref-playbook') {
    const items: SelectItem[] = [{id: 'on', label: '✓ Enable playbook memory'}, {
      id: 'off',
      label: '✗ Disable playbook memory',
    }];
    const initialIndex = config.playbookEnabled ? 0 : 1;

    return (
      <Box
        flexDirection='column'
        borderStyle='round'
        borderColor={colors.primary}
        paddingX={2}
        paddingY={1}
      >
        <SelectList
          key='playbook-mode'
          title='Enable playbook memory for cross-session learning?'
          items={items}
          selectedIndex={playbookIndex ?? initialIndex}
          onSelect={setPlaybookIndex}
          onConfirm={i => {
            const shouldEnable = i === 0;
            if (shouldEnable !== config.playbookEnabled) {
              setPlaybookEnabled(shouldEnable);
            }
            onClose();
          }}
          onCancel={() => setView('prefs')}
        />
      </Box>
    );
  }

  if (view === 'pref-cache-ttl') {
    const items: SelectItem[] = [{id: '5m', label: '5 minutes'}, {id: '1h', label: '1 hour'}];
    const initialIndex = config.cacheTtl === '1h' ? 1 : 0;

    return (
      <Box
        flexDirection='column'
        borderStyle='round'
        borderColor={colors.primary}
        paddingX={2}
        paddingY={1}
      >
        <SelectList
          key='cache-ttl-mode'
          title='How long should Anthropic cache your prompts?'
          items={items}
          selectedIndex={cacheTtlIndex ?? initialIndex}
          onSelect={setCacheTtlIndex}
          onConfirm={i => {
            const newValue = i === 0 ? '5m' : '1h';
            if (newValue !== (config.cacheTtl ?? '5m')) {
              setCacheTtl(newValue);
            }
            onClose();
          }}
          onCancel={() => setView('prefs')}
        />
      </Box>
    );
  }

  if (view === 'browse-sessions') {
    const currentModel = getCurrentModel();
    const sessions = currentModel ? listSessions(currentModel.provider, 10) : [];
    const currentSession = useChatStore.getState().session;
    const items: SelectItem[] = [
      {id: 'new', label: '+ Start a fresh new session'},
      ...sessions.map(s => ({
        id: s.path,
        label: `${s.title} (${new Date(s.createdAt).toLocaleString()})`,
      })),
    ];

    return (
      <Box
        flexDirection='column'
        borderStyle='round'
        borderColor={colors.primary}
        paddingX={2}
        paddingY={1}
      >
        <SelectList
          key='load-session'
          title='Pick a session to continue'
          items={items}
          selectedIndex={sessionsIndex}
          onSelect={setSessionsIndex}
          onConfirm={i => {
            if (items[i].id === 'new') {
              process.stdout.write('\x1Bc');
              useChatStore.getState().createNewSession();
              onClose();
            } else {
              const session = loadSession(items[i].id);
              if (session.id !== currentSession.id) {
                process.stdout.write('\x1Bc');
                useChatStore.getState().setSession(session);
              }
              onClose();
            }
          }}
          onCancel={() => setView('main')}
          emptyMessage='No previous sessions found'
        />
      </Box>
    );
  }

  if (view === 'rewind-session') {
    const currentModel = getCurrentModel();
    const session = useChatStore.getState().session;
    const rewindPoints = getRewindPoints(session);
    const items: SelectItem[] = rewindPoints.map((entry, i) => ({
      id: String(entry.index),
      label: `${rewindPoints.length - i}. ${entry.label}`,
    }));

    return (
      <Box
        flexDirection='column'
        borderStyle='round'
        borderColor={colors.primary}
        paddingX={2}
        paddingY={1}
      >
        <SelectList
          key='rewind-session'
          title='Rewind to which message?'
          items={items}
          selectedIndex={rewindIndex}
          onSelect={setRewindIndex}
          onConfirm={i => {
            if (currentModel && rewindPoints[i]) {
              const truncated = truncateSession(session, rewindPoints[i].index);
              process.stdout.write('\x1Bc');
              useChatStore.getState().setSession(truncated);
              saveSession(truncated, currentModel.provider);
            }
            onClose();
          }}
          onCancel={() => setView('main')}
          emptyMessage='No messages to rewind to'
          maxVisible={8}
        />
      </Box>
    );
  }

  return <Box />;
}
