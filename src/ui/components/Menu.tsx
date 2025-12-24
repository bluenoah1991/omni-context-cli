import { Box } from 'ink';
import React, { useState } from 'react';
import {
  addModel,
  getAgentModel,
  getAppConfig,
  initializeAppConfig,
  loadOmxConfig,
  removeModel,
  setAgentModel,
  setDefaultModel,
  toggleStreamingOutput,
  toggleThinking,
  updateAppConfig,
} from '../../services/configManager';
import { listSessions, loadSession } from '../../services/sessionManager';
import { useChatStore } from '../../store/chatStore';
import { Provider } from '../../types/config';
import { colors } from '../theme/colors';
import { SelectItem, SelectList } from './SelectList';
import { FormStep, StepForm } from './StepForm';

type View =
  | 'main'
  | 'select'
  | 'add'
  | 'set-default'
  | 'agent-model'
  | 'delete'
  | 'thinking'
  | 'streaming'
  | 'sessions';

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
}

export function Menu({onClose}: MenuProps): React.ReactElement {
  const [view, setView] = useState<View>('main');
  const [mainIndex, setMainIndex] = useState(0);
  const [selectIndex, setSelectIndex] = useState(0);
  const [setDefaultIndex, setSetDefaultIndex] = useState<number>();
  const [agentModelIndex, setAgentModelIndex] = useState<number>();
  const [deleteIndex, setDeleteIndex] = useState(0);
  const [thinkingIndex, setThinkingIndex] = useState<number>();
  const [streamingIndex, setStreamingIndex] = useState<number>();
  const [sessionsIndex, setSessionsIndex] = useState(0);

  const config = loadOmxConfig();

  if (view === 'main') {
    const items: SelectItem[] = [
      {id: 'select', label: '⤭ Switch to a different model'},
      {id: 'sessions', label: '↻ Load a previous session'},
      {id: 'add', label: '+ Add a new model'},
      {id: 'default', label: '★ Change the default model'},
      {id: 'agent-model', label: '◈ Change the agent model'},
      {id: 'delete', label: '− Remove a model'},
      {id: 'thinking', label: '◉ Toggle thinking mode'},
      {id: 'streaming', label: '⇵ Toggle streaming output'},
      {id: 'exit', label: '× Quit Omx'},
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
            if (i === 0) setView('select');
            else if (i === 1) setView('sessions');
            else if (i === 2) setView('add');
            else if (i === 3) setView('set-default');
            else if (i === 4) setView('agent-model');
            else if (i === 5) setView('delete');
            else if (i === 6) setView('thinking');
            else if (i === 7) setView('streaming');
            else if (i === 8) process.exit(0);
          }}
          onCancel={onClose}
        />
      </Box>
    );
  }

  if (view === 'select') {
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
              updateAppConfig(config.models[i], config.enableThinking, config.streamingOutput);
              onClose();
            }
          }}
          onCancel={() => setView('main')}
          emptyMessage='No models configured yet. Add one first!'
        />
      </Box>
    );
  }

  if (view === 'add') {
    const steps: FormStep[] = [
      {
        type: 'select',
        key: 'provider',
        label: 'API Type',
        options: [{value: 'anthropic', label: 'Anthropic'}, {value: 'openai', label: 'OpenAI'}],
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
            initializeAppConfig();
            onClose();
          }}
          onCancel={() => setView('main')}
        />
      </Box>
    );
  }

  if (view === 'set-default') {
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
              initializeAppConfig();
              onClose();
            }
          }}
          onCancel={() => setView('main')}
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
          onCancel={() => setView('main')}
          emptyMessage='No models configured yet. Add one first!'
        />
      </Box>
    );
  }

  if (view === 'delete') {
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
              initializeAppConfig();
              onClose();
            }
          }}
          onCancel={() => setView('main')}
          emptyMessage='No models to remove'
        />
      </Box>
    );
  }

  if (view === 'thinking') {
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
              toggleThinking();
              initializeAppConfig();
            }
            onClose();
          }}
          onCancel={() => setView('main')}
        />
      </Box>
    );
  }

  if (view === 'streaming') {
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
              toggleStreamingOutput();
              initializeAppConfig();
            }
            onClose();
          }}
          onCancel={() => setView('main')}
        />
      </Box>
    );
  }

  if (view === 'sessions') {
    const appConfig = getAppConfig();
    const sessions = listSessions(appConfig.provider, 10);
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
              process.stdout.write('\x1Bc');
              useChatStore.getState().setSession(session);
              onClose();
            }
          }}
          onCancel={() => setView('main')}
          emptyMessage='No previous sessions found'
        />
      </Box>
    );
  }

  return <Box />;
}
