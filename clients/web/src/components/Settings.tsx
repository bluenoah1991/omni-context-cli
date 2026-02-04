import { Check, Cpu, Palette, Sliders, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import SegmentedControl from './SegmentedControl';
import { Select } from './Select';
import { ToggleOption } from './ToggleOption';

interface SettingsProps {
  onClose: () => void;
}

type Tab = 'models' | 'preferences' | 'appearance';

export default function Settings({onClose}: SettingsProps) {
  const {
    models,
    config,
    currentModel,
    setCurrentModel,
    setConfig,
    thinkingExpanded,
    setThinkingExpanded,
    toolExpanded,
    setToolExpanded,
    autoDiffPanel,
    setAutoDiffPanel,
  } = useChatStore();
  const [activeTab, setActiveTab] = useState<Tab>('models');
  const [currentModelId, setCurrentModelId] = useState(currentModel?.id || '');
  const [defaultModelId, setDefaultModelId] = useState(config?.defaultModelId || '');
  const [agentModelId, setAgentModelId] = useState(config?.agentModelId || '');
  const [enableThinking, setEnableThinking] = useState(config?.enableThinking ?? true);
  const [workflowPreset, setWorkflowPreset] = useState(config?.workflowPreset ?? 'specialist');
  const [memoryEnabled, setMemoryEnabled] = useState(config?.memoryEnabled ?? false);
  const [notificationEnabled, setNotificationEnabled] = useState(
    config?.notificationEnabled ?? false,
  );
  const [contextEditing, setContextEditing] = useState(config?.contextEditing ?? true);
  const [ideContext, setIdeContext] = useState(config?.ideContext ?? true);
  const [cacheTtl, setCacheTtl] = useState<'5m' | '1h'>(config?.cacheTtl ?? '5m');
  const [webTheme, setWebTheme] = useState<'dark' | 'light' | 'auto'>(config?.webTheme || 'dark');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setCurrentModelId(currentModel?.id || '');
      setDefaultModelId(config.defaultModelId || '');
      setAgentModelId(config.agentModelId || '');
      setEnableThinking(config.enableThinking);
      setWorkflowPreset(config.workflowPreset ?? 'specialist');
      setMemoryEnabled(config.memoryEnabled);
      setNotificationEnabled(config.notificationEnabled);
      setContextEditing(config.contextEditing);
      setIdeContext(config.ideContext ?? true);
      setCacheTtl(config.cacheTtl ?? '5m');
      setWebTheme(config.webTheme || 'dark');
    }
  }, [config, currentModel]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setConfig({
        defaultModelId: defaultModelId || undefined,
        agentModelId: agentModelId || undefined,
        enableThinking,
        workflowPreset,
        memoryEnabled,
        notificationEnabled,
        contextEditing,
        ideContext,
        cacheTtl,
        webTheme,
      });
      const newModel = models.find(model => model.id === currentModelId);
      if (newModel) {
        setCurrentModel(newModel);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [{id: 'models' as Tab, label: 'Models', icon: Cpu}, {
    id: 'preferences' as Tab,
    label: 'Preferences',
    icon: Sliders,
  }, {id: 'appearance' as Tab, label: 'Appearance', icon: Palette}];

  return (
    <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in backdrop-blur-sm'>
      <div className='bg-vscode-sidebar border border-vscode-border rounded-xl w-full max-w-lg shadow-2xl transform transition-all scale-100 opacity-100 overflow-hidden m-4'>
        <div className='flex items-center justify-between px-6 py-4 border-b border-vscode-border bg-vscode-element/50'>
          <h2 className='text-lg font-semibold text-vscode-text-header'>Settings</h2>
          <button
            onClick={onClose}
            className='text-vscode-text-muted hover:text-vscode-text p-1 rounded-md hover:bg-vscode-border transition-colors'
          >
            <X size={18} />
          </button>
        </div>

        <div className='flex border-b border-vscode-border'>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-vscode-accent border-b-2 border-vscode-accent'
                  : 'text-vscode-text-muted hover:text-vscode-text'
              }`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className='p-6 space-y-5 max-h-[60vh] overflow-y-auto'>
          {activeTab === 'models' && (
            <>
              <Select
                label='Current Model'
                description='The model for this session'
                value={currentModelId}
                onChange={setCurrentModelId}
                options={models.map(model => ({
                  value: model.id,
                  label: model.nickname || model.name,
                }))}
                placeholder='Select a model'
              />

              <Select
                label='Default Model'
                description='The model for new sessions'
                value={defaultModelId}
                onChange={setDefaultModelId}
                options={models.map(model => ({
                  value: model.id,
                  label: model.nickname || model.name,
                }))}
                placeholder='Select a model'
              />

              <Select
                label='Agent Model'
                description='Model for agent tasks (defaults to current model)'
                value={agentModelId}
                onChange={setAgentModelId}
                options={models.map(model => ({
                  value: model.id,
                  label: model.nickname || model.name,
                }))}
                placeholder='Use main model'
              />
            </>
          )}

          {activeTab === 'preferences' && (
            <>
              <SegmentedControl
                label='Workflow Preset'
                description='Assistant behavior'
                options={['normal', 'specialist', 'artist', 'explorer'] as const}
                value={workflowPreset}
                onChange={setWorkflowPreset}
              />

              <ToggleOption
                label='Completion Notification'
                description='Notify when response takes over a minute'
                enabled={notificationEnabled}
                onChange={setNotificationEnabled}
              />

              <ToggleOption
                label='Context Editing'
                description='Allow context modification during conversation'
                enabled={contextEditing}
                onChange={setContextEditing}
              />

              <ToggleOption
                label='Cross-session Memory'
                description='Persist key information across sessions'
                enabled={memoryEnabled}
                onChange={setMemoryEnabled}
              />

              <ToggleOption
                label='Extended Thinking'
                description='Enable chain-of-thought reasoning'
                enabled={enableThinking}
                onChange={setEnableThinking}
              />

              <ToggleOption
                label='IDE Context'
                description='Include context from connected IDE'
                enabled={ideContext}
                onChange={setIdeContext}
              />

              <SegmentedControl
                label='Response Cache'
                description='Cache duration for Anthropic API prompt caching'
                options={['5m', '1h'] as const}
                value={cacheTtl}
                onChange={setCacheTtl}
              />
            </>
          )}

          {activeTab === 'appearance' && (
            <>
              <SegmentedControl
                label='Color Theme'
                description='Select interface appearance'
                options={['dark', 'light', 'auto'] as const}
                value={webTheme}
                onChange={setWebTheme}
              />

              <ToggleOption
                label='Expand Thinking by Default'
                description='Show thinking process content expanded'
                enabled={thinkingExpanded}
                onChange={setThinkingExpanded}
              />

              <ToggleOption
                label='Expand Tool Calls by Default'
                description='Show tool call content expanded'
                enabled={toolExpanded}
                onChange={setToolExpanded}
              />

              <ToggleOption
                label='Auto Open Diff Panel'
                description='Automatically show file changes when editing'
                enabled={autoDiffPanel}
                onChange={setAutoDiffPanel}
              />
            </>
          )}
        </div>

        <div className='flex justify-end gap-3 px-6 py-4 border-t border-vscode-border bg-vscode-element/30'>
          <button
            onClick={onClose}
            className='px-4 py-2 text-sm font-medium text-vscode-text hover:bg-vscode-border rounded-lg transition-colors'
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className='px-6 py-2 text-sm font-medium bg-vscode-accent text-white rounded-lg hover:brightness-110 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-vscode-accent/20 flex items-center gap-2'
          >
            {saving ? ('Saving...') : (
              <>
                <Check size={16} />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
