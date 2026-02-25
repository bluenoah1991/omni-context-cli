import { Check, Cpu, Palette, Sliders, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SUPPORTED_LANGUAGES, useLocale } from '../i18n';
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
    inlineDiff,
    setInlineDiff,
  } = useChatStore();
  const [activeTab, setActiveTab] = useState<Tab>('models');
  const [currentModelId, setCurrentModelId] = useState(currentModel?.id || '');
  const [defaultModelId, setDefaultModelId] = useState(config?.defaultModelId || '');
  const [agentModelId, setAgentModelId] = useState(config?.agentModelId || '');
  const [enableThinking, setEnableThinking] = useState(config?.enableThinking ?? true);
  const [workflowPreset, setWorkflowPreset] = useState(config?.workflowPreset ?? 'specialist');
  const [memoryEnabled, setMemoryEnabled] = useState(config?.memoryEnabled ?? false);
  const [contextEditing, setContextEditing] = useState(config?.contextEditing ?? true);
  const [ideContext, setIdeContext] = useState(config?.ideContext ?? true);
  const [serverCompaction, setServerCompaction] = useState(config?.serverCompaction ?? false);
  const [responseLanguage, setResponseLanguage] = useState<'auto' | 'en' | 'zh'>(
    config?.responseLanguage ?? 'auto',
  );
  const [cacheTtl, setCacheTtl] = useState<'5m' | '1h'>(config?.cacheTtl ?? '5m');
  const [webTheme, setWebTheme] = useState<'dark' | 'light' | 'auto'>(config?.webTheme || 'dark');
  const [language, setLanguage] = useState(config?.language || 'en-US');
  const [saving, setSaving] = useState(false);
  const t = useLocale();

  useEffect(() => {
    if (config) {
      setCurrentModelId(currentModel?.id || '');
      setDefaultModelId(config.defaultModelId || '');
      setAgentModelId(config.agentModelId || '');
      setEnableThinking(config.enableThinking);
      setWorkflowPreset(config.workflowPreset ?? 'specialist');
      setMemoryEnabled(config.memoryEnabled);
      setContextEditing(config.contextEditing);
      setServerCompaction(config.serverCompaction ?? false);
      setResponseLanguage(config.responseLanguage ?? 'auto');
      setIdeContext(config.ideContext ?? true);
      setCacheTtl(config.cacheTtl ?? '5m');
      setWebTheme(config.webTheme || 'dark');
      setLanguage(config.language || 'en-US');
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
        contextEditing,
        serverCompaction,
        responseLanguage,
        ideContext,
        cacheTtl,
        webTheme,
        language,
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

  const tabs = [{id: 'models' as Tab, label: t.settings.tabs.models, icon: Cpu}, {
    id: 'preferences' as Tab,
    label: t.settings.tabs.preferences,
    icon: Sliders,
  }, {id: 'appearance' as Tab, label: t.settings.tabs.appearance, icon: Palette}];

  return (
    <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in backdrop-blur-sm'>
      <div className='bg-vscode-sidebar border border-vscode-border rounded-xl w-full max-w-lg shadow-2xl transform transition-all scale-100 opacity-100 overflow-hidden m-4'>
        <div className='flex items-center justify-between px-6 py-4 border-b border-vscode-border bg-vscode-element/50'>
          <h2 className='text-lg font-semibold text-vscode-text-header'>{t.settings.title}</h2>
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
                label={t.settings.currentModel}
                description={t.settings.currentModelDescription}
                value={currentModelId}
                onChange={setCurrentModelId}
                options={models.map(model => ({
                  value: model.id,
                  label: model.nickname || model.name,
                }))}
                placeholder={t.settings.selectModel}
              />

              <Select
                label={t.settings.defaultModel}
                description={t.settings.defaultModelDescription}
                value={defaultModelId}
                onChange={setDefaultModelId}
                options={models.map(model => ({
                  value: model.id,
                  label: model.nickname || model.name,
                }))}
                placeholder={t.settings.selectModel}
              />

              <Select
                label={t.settings.agentModel}
                description={t.settings.agentModelDescription}
                value={agentModelId}
                onChange={setAgentModelId}
                options={models.map(model => ({
                  value: model.id,
                  label: model.nickname || model.name,
                }))}
                placeholder={t.settings.useMainModel}
              />
            </>
          )}

          {activeTab === 'preferences' && (
            <>
              <Select
                label={t.settings.workflowPreset}
                description={t.settings.workflowPresetDescription}
                value={workflowPreset}
                onChange={v => setWorkflowPreset(v as typeof workflowPreset)}
                options={[
                  {value: 'normal', label: t.settings.normal},
                  {value: 'specialist', label: t.settings.specialist},
                  {value: 'artist', label: t.settings.artist},
                  {value: 'explorer', label: t.settings.explorer},
                  {value: 'assistant', label: t.settings.assistant},
                ]}
                placeholder=''
              />

              <Select
                label={t.settings.responseLanguage}
                description={t.settings.responseLanguageDescription}
                value={responseLanguage}
                onChange={v => setResponseLanguage(v as typeof responseLanguage)}
                options={[{value: 'auto', label: t.settings.responseLanguageAuto}, {
                  value: 'en',
                  label: t.settings.responseLanguageEn,
                }, {value: 'zh', label: t.settings.responseLanguageZh}]}
                placeholder=''
              />

              <ToggleOption
                label={t.settings.contextEditing}
                description={t.settings.contextEditingDescription}
                enabled={contextEditing}
                onChange={setContextEditing}
              />

              <ToggleOption
                label={t.settings.serverCompaction}
                description={t.settings.serverCompactionDescription}
                enabled={serverCompaction}
                onChange={setServerCompaction}
              />

              <ToggleOption
                label={t.settings.memory}
                description={t.settings.memoryDescription}
                enabled={memoryEnabled}
                onChange={setMemoryEnabled}
              />

              <ToggleOption
                label={t.settings.thinking}
                description={t.settings.thinkingDescription}
                enabled={enableThinking}
                onChange={setEnableThinking}
              />

              <ToggleOption
                label={t.settings.ideContext}
                description={t.settings.ideContextDescription}
                enabled={ideContext}
                onChange={setIdeContext}
              />

              <SegmentedControl
                label={t.settings.cacheDuration}
                description={t.settings.cacheDurationDescription}
                options={['5m', '1h'] as const}
                value={cacheTtl}
                onChange={setCacheTtl}
              />
            </>
          )}

          {activeTab === 'appearance' && (
            <>
              <Select
                label={t.settings.language}
                description={t.settings.languageDescription}
                value={language}
                onChange={setLanguage}
                options={SUPPORTED_LANGUAGES}
              />

              <SegmentedControl
                label={t.settings.colorTheme}
                description={t.settings.colorThemeDescription}
                options={['dark', 'light', 'auto'] as const}
                value={webTheme}
                onChange={setWebTheme}
              />

              <ToggleOption
                label={t.settings.expandThinking}
                description={t.settings.expandThinkingDescription}
                enabled={thinkingExpanded}
                onChange={setThinkingExpanded}
              />

              <ToggleOption
                label={t.settings.expandTools}
                description={t.settings.expandToolsDescription}
                enabled={toolExpanded}
                onChange={setToolExpanded}
              />

              <ToggleOption
                label={t.settings.autoDiffs}
                description={t.settings.autoDiffsDescription}
                enabled={autoDiffPanel}
                onChange={setAutoDiffPanel}
              />

              <ToggleOption
                label={t.settings.inlineDiffs}
                description={t.settings.inlineDiffsDescription}
                enabled={inlineDiff}
                onChange={setInlineDiff}
              />
            </>
          )}
        </div>

        <div className='flex justify-end gap-3 px-6 py-4 border-t border-vscode-border bg-vscode-element/30'>
          <button
            onClick={onClose}
            className='px-4 py-2 text-sm font-medium text-vscode-text hover:bg-vscode-border rounded-lg transition-colors'
          >
            {t.settings.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className='px-6 py-2 text-sm font-medium bg-vscode-accent text-white rounded-lg hover:brightness-110 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-vscode-accent/20 flex items-center gap-2'
          >
            {saving ? (t.settings.saving) : (
              <>
                <Check size={16} />
                <span>{t.settings.save}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
