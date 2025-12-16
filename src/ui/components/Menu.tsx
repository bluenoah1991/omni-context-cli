import { Box } from 'ink';
import React, { useState } from 'react';
import {
  addModel,
  getAppConfig,
  initializeAppConfig,
  loadOmxConfig,
  removeModel,
  setDefaultModel,
  toggleThinking,
  updateAppConfig,
} from '../../services/configManager';
import { listSessions, loadSession } from '../../services/sessionManager';
import { useChatStore } from '../../store/chatStore';
import { Provider } from '../../types/config';
import { colors } from '../theme/colors';
import { SelectItem, SelectList } from './SelectList';
import { FormStep, StepForm } from './StepForm';

type View = 'main' | 'select' | 'add' | 'set-default' | 'delete' | 'thinking' | 'sessions';

interface MenuProps {
  onClose: () => void;
}

export function Menu({onClose}: MenuProps): React.ReactElement {
  const [view, setView] = useState<View>('main');
  const [mainIndex, setMainIndex] = useState(0);
  const [selectIndex, setSelectIndex] = useState(0);
  const [setDefaultIndex, setSetDefaultIndex] = useState<number>();
  const [deleteIndex, setDeleteIndex] = useState(0);
  const [thinkingIndex, setThinkingIndex] = useState<number>();
  const [sessionsIndex, setSessionsIndex] = useState(0);

  const config = loadOmxConfig();

  if (view === 'main') {
    const items: SelectItem[] = [
      {id: 'select', label: 'Select Model'},
      {id: 'sessions', label: 'Load Session'},
      {id: 'add', label: 'Add Model'},
      {id: 'default', label: 'Set Default Model'},
      {id: 'delete', label: 'Delete Model'},
      {id: 'thinking', label: 'Thinking Mode'},
      {id: 'exit', label: 'Exit'},
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
          title='Menu'
          items={items}
          selectedIndex={mainIndex}
          onSelect={setMainIndex}
          onConfirm={i => {
            if (i === 0) setView('select');
            else if (i === 1) setView('sessions');
            else if (i === 2) setView('add');
            else if (i === 3) setView('set-default');
            else if (i === 4) setView('delete');
            else if (i === 5) setView('thinking');
            else if (i === 6) process.exit(0);
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
          title='Select Model'
          items={items}
          selectedIndex={selectIndex}
          onSelect={setSelectIndex}
          onConfirm={i => {
            if (config.models[i]) {
              updateAppConfig(config.models[i], config.enableThinking);
              onClose();
            }
          }}
          onCancel={() => setView('main')}
          emptyMessage='No models configured'
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
      {type: 'text', key: 'model', label: 'Model Name', placeholder: 'e.g. gpt-4'},
      {type: 'text', key: 'apiKey', label: 'API Key', mask: true},
      {type: 'text', key: 'apiUrl', label: 'API URL', placeholder: 'Leave empty for default'},
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
          initialValues={{provider: 'anthropic', model: '', apiKey: '', apiUrl: '', nickname: ''}}
          onSubmit={values => {
            addModel({
              name: values.model,
              nickname: values.nickname,
              provider: values.provider as Provider,
              apiKey: values.apiKey,
              apiUrl: values.apiUrl,
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
          title='Set Default Model'
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
          emptyMessage='No models configured'
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
          title='Delete Model'
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
          emptyMessage='No models configured'
        />
      </Box>
    );
  }

  if (view === 'thinking') {
    const items: SelectItem[] = [{id: 'on', label: 'ON'}, {id: 'off', label: 'OFF'}];
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
          title='Thinking Mode'
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

  if (view === 'sessions') {
    const appConfig = getAppConfig();
    const sessions = listSessions(appConfig.provider, 10);
    const items: SelectItem[] = [
      {id: 'new', label: 'New Session'},
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
          title='Load Session'
          items={items}
          selectedIndex={sessionsIndex}
          onSelect={setSessionsIndex}
          onConfirm={i => {
            if (items[i].id === 'new') {
              useChatStore.getState().createNewSession();
              onClose();
            } else {
              const session = loadSession(items[i].id);
              useChatStore.getState().setSession(session);
              onClose();
            }
          }}
          onCancel={() => setView('main')}
          emptyMessage='No sessions found'
        />
      </Box>
    );
  }

  return <Box />;
}
