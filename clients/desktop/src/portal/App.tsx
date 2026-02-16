import {
  AlertCircle,
  Box,
  CheckCircle2,
  Chrome,
  ClipboardCopy,
  Figma,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Gem,
  LayoutGrid,
  Loader2,
  type LucideIcon,
  Rocket,
  RotateCcw,
  Save,
  Shield,
  Square,
  X,
} from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { ProviderItem } from './components/ProviderItem';
import { Select } from './components/Select';
import { addProviderModels, removeProviderModels } from './providers';
import { type CustomPrompts, type PromptType, usePortalStore } from './store/portalStore';
import type { ApprovalMode, Tab } from './types/config';

interface NavItemProps {
  id: Tab;
  icon: LucideIcon;
  label: string;
  alert?: boolean;
  activeTab: Tab;
  onClick: (id: Tab) => void;
}

const NavItem = memo(
  function NavItem({id, icon: Icon, label, alert, activeTab, onClick}: NavItemProps) {
    return (
      <button
        onClick={() => onClick(id)}
        className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors border-l-4 ${
          activeTab === id
            ? 'bg-vscode-element border-vscode-accent text-vscode-text-header'
            : 'border-transparent text-vscode-text-muted hover:text-vscode-text hover:bg-vscode-element/50'
        }`}
      >
        <Icon size={18} className={activeTab === id ? 'text-vscode-accent' : ''} />
        <span>{label}</span>
        {alert && <div className='ml-auto w-2 h-2 rounded-full bg-vscode-error' />}
      </button>
    );
  },
);

export default function App() {
  const {
    omxConfig,
    desktopConfig,
    loading,
    activeTab,
    selectedWorkspace,
    selectedProvider,
    apiKey,
    providerError,
    isAddingProvider,
    approvalMode,
    configuredProviders,
    availableProviders,
    canLaunch,
    customPrompts,
    selectedPromptType,
    promptEditorValue,
    setOmxConfig,
    setDesktopConfig,
    setLoading,
    setActiveTab,
    setSelectedWorkspace,
    setSelectedProvider,
    setApiKey,
    setProviderError,
    setIsAddingProvider,
    setApprovalMode,
    clearProviderForm,
    setCustomPrompts,
    setSelectedPromptType,
    setPromptEditorValue,
    officeInstalled,
    officeRunning,
    officePort,
    setOfficeStatus,
  } = usePortalStore();

  const [appVersion, setAppVersion] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [isOfficeLoading, setIsOfficeLoading] = useState(false);
  const [serveOnly, setServeOnly] = useState(false);
  const [servePort, setServePort] = useState<number | null>(null);
  const [serveTls, setServeTls] = useState(false);
  const [serveSnapshot, setServeSnapshot] = useState<
    {workspace: string; models: number; approval: string;} | null
  >(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    const webTheme = omxConfig.webTheme;
    const isLight = webTheme === 'light'
      || (webTheme === 'auto' && window.matchMedia('(prefers-color-scheme: light)').matches);
    document.documentElement.classList.toggle('light', isLight);

    if (webTheme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
      const updateTheme = (e: MediaQueryListEvent) => {
        document.documentElement.classList.toggle('light', e.matches);
      };
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    }
  }, [omxConfig.webTheme]);

  async function init() {
    try {
      const omx = await window.electronAPI.getOmxConfig();
      const desktop = await window.electronAPI.getDesktopConfig();
      const version = await window.electronAPI.getVersion();

      setAppVersion(version);
      setOmxConfig(omx);
      setDesktopConfig(desktop);

      setApprovalMode(desktop.approvalMode ?? 'write');

      let workspace = desktop.defaultWorkspace;
      if (
        desktop.lastWorkspace && await window.electronAPI.checkPathExists(desktop.lastWorkspace)
      ) {
        workspace = desktop.lastWorkspace;
      }
      setSelectedWorkspace(workspace);

      const [specialist, artist, explorer, assistant] = await Promise.all([
        window.electronAPI.getCustomPrompt('specialist'),
        window.electronAPI.getCustomPrompt('artist'),
        window.electronAPI.getCustomPrompt('explorer'),
        window.electronAPI.getCustomPrompt('assistant'),
      ]);
      const prompts: CustomPrompts = {specialist, artist, explorer, assistant};
      setCustomPrompts(prompts);
      setPromptEditorValue(prompts.specialist ?? '');

      const officeStatus = await window.electronAPI.getOfficeStatus();
      setOfficeStatus(officeStatus);

      const serveStatus = await window.electronAPI.getServeStatus();
      if (serveStatus.running && serveStatus.port) {
        setServePort(serveStatus.port);
        setServeTls(serveStatus.tls);
        setServeSnapshot({
          workspace: workspace,
          models: omx.models.length,
          approval: desktop.approvalMode ?? 'write',
        });
      }

      if (omx.models.length === 0) {
        setActiveTab('models');
      }
    } catch (e) {
      console.error('Failed to init:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleBrowse = async () => {
    try {
      const folder = await window.electronAPI.selectFolder();
      if (folder) {
        const name = folder.split(/[/\\]/).pop() || folder;
        const exists = desktopConfig.workspaces.some(ws => ws.path === folder);

        if (!exists) {
          const newWorkspaces = [...desktopConfig.workspaces, {name, path: folder}];
          const newConfig = {...desktopConfig, workspaces: newWorkspaces};
          setDesktopConfig(newConfig);
          await window.electronAPI.saveDesktopConfig(newConfig);
        }

        setSelectedWorkspace(folder);
        setActiveTab('workspaces');
      }
    } catch (e) {
      console.error('Failed to select folder:', e);
    }
  };

  const handleAddProvider = async () => {
    if (!selectedProvider || !apiKey) return;

    setProviderError('');
    setIsAddingProvider(true);

    try {
      const newModels = await addProviderModels(selectedProvider, apiKey, omxConfig.models);
      const newConfig = {...omxConfig, models: newModels};
      setOmxConfig(newConfig);
      await window.electronAPI.saveOmxConfig(newConfig);
      clearProviderForm();
    } catch (err) {
      setProviderError(err instanceof Error ? err.message : 'Failed to add provider');
    } finally {
      setIsAddingProvider(false);
    }
  };

  const handleRemoveProvider = async (providerId: string) => {
    try {
      const newModels = removeProviderModels(providerId, omxConfig.models);
      let defaultModelId = omxConfig.defaultModelId;

      if (defaultModelId) {
        const defaultExists = newModels.some(m => m.id === defaultModelId);
        if (!defaultExists) {
          defaultModelId = newModels[0]?.id;
        }
      }

      const newConfig = {...omxConfig, models: newModels, defaultModelId};
      setOmxConfig(newConfig);
      await window.electronAPI.saveOmxConfig(newConfig);
    } catch (e) {
      console.error('Failed to remove provider:', e);
    }
  };

  const handleApprovalModeChange = async (value: string) => {
    try {
      const mode = value as ApprovalMode;
      setApprovalMode(mode);

      const newConfig = {...desktopConfig, approvalMode: mode};
      setDesktopConfig(newConfig);
      await window.electronAPI.saveDesktopConfig(newConfig);
    } catch (e) {
      console.error('Failed to save approval mode:', e);
    }
  };

  const handleRemoveWorkspace = async (path: string) => {
    try {
      const newWorkspaces = desktopConfig.workspaces.filter(ws => ws.path !== path);
      const newConfig = {...desktopConfig, workspaces: newWorkspaces};
      setDesktopConfig(newConfig);
      await window.electronAPI.saveDesktopConfig(newConfig);

      if (selectedWorkspace === path) {
        setSelectedWorkspace('');
      }
    } catch (e) {
      console.error('Failed to remove workspace:', e);
    }
  };

  const handlePromptTypeChange = (type: PromptType) => {
    setSelectedPromptType(type);
  };

  const handleSavePrompt = async () => {
    if (!promptEditorValue.trim()) return;
    setIsSavingPrompt(true);
    try {
      await window.electronAPI.saveCustomPrompt(selectedPromptType, promptEditorValue);
      setCustomPrompts({...customPrompts, [selectedPromptType]: promptEditorValue});
    } catch (e) {
      console.error('Failed to save prompt:', e);
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleResetPrompt = async () => {
    try {
      await window.electronAPI.deleteCustomPrompt(selectedPromptType);
      setCustomPrompts({...customPrompts, [selectedPromptType]: null});
      setPromptEditorValue('');
    } catch (e) {
      console.error('Failed to reset prompt:', e);
    }
  };

  const handleInstallOffice = async () => {
    setIsOfficeLoading(true);
    try {
      const result = await window.electronAPI.installOfficeAddin();
      if (!result.success) throw new Error(result.error);
      setOfficeStatus(await window.electronAPI.getOfficeStatus());
    } catch (e) {
      console.error('Office install failed:', e);
    } finally {
      setIsOfficeLoading(false);
    }
  };

  const handleUninstallOffice = async () => {
    setIsOfficeLoading(true);
    try {
      await window.electronAPI.uninstallOfficeAddin();
      setOfficeStatus(await window.electronAPI.getOfficeStatus());
    } catch (e) {
      console.error('Office uninstall failed:', e);
    } finally {
      setIsOfficeLoading(false);
    }
  };

  const handleLaunch = async () => {
    if (!selectedWorkspace) return;

    try {
      const exists = await window.electronAPI.checkPathExists(selectedWorkspace);
      if (!exists) {
        setSelectedWorkspace('');
        return;
      }

      const newConfig = {...desktopConfig, lastWorkspace: selectedWorkspace};
      await window.electronAPI.saveDesktopConfig(newConfig);

      if (serveOnly) {
        const result = await window.electronAPI.startServe(
          selectedWorkspace,
          approvalMode,
          'assistant',
        );
        if (result.success && result.port) {
          setServePort(result.port);
          setServeTls(result.tls ?? false);
          setServeSnapshot({
            workspace: selectedWorkspace,
            models: omxConfig.models.length,
            approval: approvalMode,
          });
        }
      } else {
        window.electronAPI.launch(selectedWorkspace, approvalMode);
      }
    } catch (e) {
      console.error('Failed to launch:', e);
    }
  };

  const serveUrl = servePort ? `${serveTls ? 'https' : 'http'}://localhost:${servePort}` : null;

  const handleStopServe = async () => {
    await window.electronAPI.stopServe();
    setServePort(null);
    setServeTls(false);
    setServeSnapshot(null);
  };

  if (loading) {
    return (
      <div className='h-screen w-screen bg-vscode-bg flex items-center justify-center text-vscode-text'>
        <Loader2 className='animate-spin mr-2' /> Loading...
      </div>
    );
  }

  return (
    <div className='h-screen w-screen bg-vscode-bg text-vscode-text flex overflow-hidden font-sans select-none'>
      <div className='w-80 bg-vscode-sidebar border-r border-vscode-border flex flex-col shrink-0'>
        <div className='p-4'>
          <h1 className='flex items-center gap-2'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 230 60'
              className='h-10 text-vscode-text-header'
              fill='currentColor'
            >
              <defs>
                <mask id='cutout'>
                  <rect width='230' height='60' fill='white' />
                  <polygon points='19,16.9 10.1,40.7 27.9,40.7' fill='black' />
                </mask>
              </defs>
              <circle cx='19' cy='30' r='19' mask='url(#cutout)' />
              <text
                x='50'
                y='40'
                fontFamily='Arial, Helvetica, sans-serif'
                fontSize='28'
                fontWeight='700'
              >
                OmniContext
              </text>
            </svg>
            {appVersion && <span className='text-xs text-vscode-text-muted'>v{appVersion}</span>}
          </h1>
        </div>

        <nav className='flex-1'>
          <NavItem
            id='workspaces'
            icon={LayoutGrid}
            label='Workspaces'
            activeTab={activeTab}
            onClick={setActiveTab}
          />
          <NavItem
            id='models'
            icon={Box}
            label='Models'
            alert={omxConfig.models.length === 0}
            activeTab={activeTab}
            onClick={setActiveTab}
          />
          <NavItem
            id='permissions'
            icon={Shield}
            label='Permissions'
            activeTab={activeTab}
            onClick={setActiveTab}
          />
          <NavItem
            id='office'
            icon={FileSpreadsheet}
            label='Office Integration'
            activeTab={activeTab}
            onClick={setActiveTab}
          />
          <NavItem
            id='browser'
            icon={Chrome}
            label='Browser Integration'
            activeTab={activeTab}
            onClick={setActiveTab}
          />
          <NavItem
            id='obsidian'
            icon={Gem}
            label='Obsidian Integration'
            activeTab={activeTab}
            onClick={setActiveTab}
          />
          <NavItem
            id='figma'
            icon={Figma}
            label='Figma Integration'
            activeTab={activeTab}
            onClick={setActiveTab}
          />
          <NavItem
            id='prompts'
            icon={FileText}
            label='Prompts'
            activeTab={activeTab}
            onClick={setActiveTab}
          />
        </nav>

        <div className='px-4 py-4 border-t border-vscode-border bg-vscode-element/10'>
          {servePort
            ? (
              <div className='space-y-4'>
                {serveSnapshot && (
                  <div className='space-y-2 text-sm opacity-60'>
                    <div className='flex items-center gap-3'>
                      <FolderOpen size={16} className='text-vscode-accent shrink-0' />
                      <span
                        className='text-vscode-text-header truncate'
                        title={serveSnapshot.workspace}
                      >
                        {serveSnapshot.workspace.split(/[/\\]/).pop()}
                      </span>
                    </div>
                    <div className='flex items-center gap-3'>
                      <Box size={16} className='text-vscode-accent shrink-0' />
                      <span className='text-vscode-text-header'>{serveSnapshot.models} models</span>
                    </div>
                    <div className='flex items-center gap-3'>
                      <Shield
                        size={16}
                        className={`shrink-0 ${
                          serveSnapshot.approval === 'none'
                            ? 'text-vscode-warning'
                            : 'text-vscode-accent'
                        }`}
                      />
                      <span className='text-vscode-text-header'>
                        {serveSnapshot.approval === 'none'
                          ? 'No Approval'
                          : serveSnapshot.approval === 'write'
                          ? 'Write Approval'
                          : 'Full Approval'}
                      </span>
                    </div>
                  </div>
                )}

                <div
                  className='flex items-center gap-3 p-3 bg-vscode-bg rounded-lg border border-vscode-border cursor-pointer hover:border-vscode-accent transition-colors group'
                  onClick={() => {
                    navigator.clipboard.writeText(serveUrl!);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  title='Click to copy'
                >
                  <div className='w-2.5 h-2.5 rounded-full bg-green-500 shrink-0' />
                  <span className='text-sm text-vscode-text-header font-mono flex-1 truncate'>
                    {serveUrl}
                  </span>
                  <ClipboardCopy
                    size={14}
                    className={`shrink-0 transition-colors ${
                      copied
                        ? 'text-green-500'
                        : 'text-vscode-text-muted group-hover:text-vscode-accent'
                    }`}
                  />
                </div>
                <p className='text-xs text-vscode-text-muted'>
                  Paste this URL into the Office add-in or browser extension to connect.
                </p>

                <button
                  onClick={handleStopServe}
                  className='w-full py-2 bg-vscode-bg hover:bg-vscode-element border border-vscode-border rounded-lg text-vscode-text-muted hover:text-vscode-text transition-all flex items-center justify-center gap-2 font-medium text-sm'
                >
                  <Square size={16} />
                  Stop Serving
                </button>
              </div>
            )
            : (
              <div>
                <div className='mb-6 space-y-3'>
                  <div className='flex items-center gap-3 text-sm'>
                    {selectedWorkspace
                      ? <FolderOpen size={16} className='text-vscode-accent shrink-0' />
                      : <AlertCircle size={16} className='text-vscode-error shrink-0' />}
                    <span
                      className={`truncate ${
                        selectedWorkspace ? 'text-vscode-text-header' : 'text-vscode-text-muted'
                      }`}
                      title={selectedWorkspace}
                    >
                      {selectedWorkspace ? selectedWorkspace.split(/[/\\]/).pop() : 'No workspace'}
                    </span>
                  </div>
                  <div className='flex items-center gap-3 text-sm'>
                    {omxConfig.models.length > 0
                      ? <Box size={16} className='text-vscode-accent shrink-0' />
                      : <AlertCircle size={16} className='text-vscode-error shrink-0' />}
                    <span
                      className={omxConfig.models.length > 0
                        ? 'text-vscode-text-header'
                        : 'text-vscode-text-muted'}
                    >
                      {omxConfig.models.length > 0
                        ? `${omxConfig.models.length} models ready`
                        : 'No models'}
                    </span>
                  </div>
                  <div className='flex items-center gap-3 text-sm'>
                    <Shield
                      size={16}
                      className={`shrink-0 ${
                        approvalMode === 'none' ? 'text-vscode-warning' : 'text-vscode-accent'
                      }`}
                    />
                    <span className='text-vscode-text-header'>
                      {approvalMode === 'none'
                        ? 'No Approval'
                        : approvalMode === 'write'
                        ? 'Write Approval'
                        : 'Full Approval'}
                    </span>
                  </div>
                </div>

                <label className='flex items-center gap-2 mb-4 text-sm cursor-pointer select-none'>
                  <input
                    type='checkbox'
                    checked={serveOnly}
                    onChange={e => setServeOnly(e.target.checked)}
                    className='accent-vscode-accent'
                  />
                  <span className='text-vscode-text-muted'>Serve only (for Office / Browser)</span>
                </label>

                <button
                  onClick={handleLaunch}
                  disabled={!canLaunch}
                  className='w-full py-2 bg-vscode-accent hover:bg-vscode-accent/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white shadow-lg transition-all flex items-center justify-center gap-2 font-medium text-sm'
                >
                  <Rocket size={16} />
                  {serveOnly ? 'Start Serving' : 'Launch'}
                </button>
              </div>
            )}
        </div>
      </div>

      <div className='flex-1 flex flex-col min-w-0 bg-vscode-bg overflow-hidden'>
        <div className='flex-1 overflow-y-auto p-4'>
          {activeTab === 'workspaces' && (
            <div className='max-w-3xl mx-auto w-full space-y-6'>
              <header>
                <h2 className='text-lg font-medium text-vscode-text-header mb-1'>Workspaces</h2>
                <p className='text-vscode-text-muted text-sm'>
                  Open a folder or select a recent project
                </p>
              </header>

              <div className='space-y-6'>
                <div>
                  <h3 className='text-xs font-semibold text-vscode-text-muted uppercase tracking-wider mb-2'>
                    Start
                  </h3>
                  <button
                    onClick={handleBrowse}
                    className='w-full p-4 bg-vscode-element hover:bg-vscode-element/80 border border-vscode-border hover:border-vscode-accent rounded-lg text-left transition-all group flex items-center gap-4'
                  >
                    <div className='p-2 rounded-lg bg-vscode-accent/10 text-vscode-accent group-hover:bg-vscode-accent group-hover:text-white transition-colors'>
                      <FolderOpen size={20} />
                    </div>
                    <div>
                      <div className='text-sm font-medium text-vscode-text-header group-hover:text-vscode-accent transition-colors'>
                        Open Folder
                      </div>
                      <div className='text-vscode-text-muted text-xs mt-0.5'>
                        Browse your file system
                      </div>
                    </div>
                  </button>
                </div>

                {desktopConfig.workspaces.length > 0 && (
                  <div>
                    <h3 className='text-xs font-semibold text-vscode-text-muted uppercase tracking-wider mb-2'>
                      Recent
                    </h3>
                    <div className='space-y-4'>
                      {desktopConfig.workspaces.map(ws => (
                        <div
                          key={ws.path}
                          onClick={() => setSelectedWorkspace(ws.path)}
                          className={`w-full p-4 rounded-lg border transition-all flex items-center gap-4 group cursor-pointer ${
                            selectedWorkspace === ws.path
                              ? 'bg-vscode-accent/10 border-vscode-accent'
                              : 'bg-transparent border-transparent hover:bg-vscode-element'
                          }`}
                        >
                          <div className='flex items-center gap-4 flex-1 min-w-0 text-left'>
                            <div
                              className={`p-2 rounded ${
                                selectedWorkspace === ws.path
                                  ? 'bg-vscode-accent text-white'
                                  : 'text-vscode-text-muted bg-vscode-element/50'
                              }`}
                            >
                              <FolderOpen size={16} />
                            </div>
                            <div className='flex-1 min-w-0'>
                              <div
                                className={`text-sm font-medium truncate ${
                                  selectedWorkspace === ws.path
                                    ? 'text-vscode-accent'
                                    : 'text-vscode-text-header'
                                }`}
                              >
                                {ws.name}
                              </div>
                              <div className='text-xs text-vscode-text-muted truncate opacity-70'>
                                {ws.path}
                              </div>
                            </div>
                          </div>
                          {selectedWorkspace === ws.path
                            ? (
                              <div className='p-2'>
                                <CheckCircle2 size={16} className='text-vscode-accent shrink-0' />
                              </div>
                            )
                            : ws.path !== desktopConfig.defaultWorkspace && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  handleRemoveWorkspace(ws.path);
                                }}
                                className='p-2 rounded text-vscode-text-muted hover:text-vscode-error hover:bg-vscode-error/10 transition-colors opacity-0 group-hover:opacity-100'
                                title='Remove from list'
                              >
                                <X size={16} />
                              </button>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'models' && (
            <div className='max-w-3xl mx-auto space-y-6'>
              <header className='flex items-center justify-between'>
                <div>
                  <h2 className='text-lg font-medium text-vscode-text-header mb-1'>
                    Model Providers
                  </h2>
                  <p className='text-vscode-text-muted text-sm'>Configure LLM API providers</p>
                </div>
                {omxConfig.models.length === 0 && (
                  <div className='px-3 py-1 bg-vscode-error/20 text-vscode-error text-xs rounded-full border border-vscode-error/20'>
                    Required
                  </div>
                )}
              </header>

              <div className='bg-vscode-element border border-vscode-border rounded-lg p-4 shadow-sm'>
                <h3 className='text-sm font-medium text-vscode-text-header mb-4'>
                  Add New Provider
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
                  <Select
                    label=''
                    value={selectedProvider}
                    onChange={setSelectedProvider}
                    options={availableProviders}
                    placeholder='Select Provider...'
                  />
                  <input
                    type='password'
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder='Enter API Key'
                    autoComplete='off'
                    className='w-full px-3 py-2 bg-vscode-bg border border-vscode-border rounded-lg text-sm text-vscode-text focus:outline-none focus:border-vscode-accent select-text'
                  />
                </div>
                <button
                  onClick={handleAddProvider}
                  disabled={!selectedProvider || !apiKey || isAddingProvider}
                  className='px-4 py-2 bg-vscode-accent hover:bg-vscode-accent/90 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 w-full md:w-auto'
                >
                  {isAddingProvider && <Loader2 size={16} className='animate-spin' />}
                  {isAddingProvider ? 'Adding...' : 'Add Provider'}
                </button>
                {providerError && (
                  <div className='mt-3 text-xs text-vscode-error flex items-center gap-2'>
                    <AlertCircle size={14} />
                    {providerError}
                  </div>
                )}
              </div>

              <div className='space-y-4'>
                <h3 className='text-xs font-semibold text-vscode-text-muted uppercase tracking-wider'>
                  Configured
                </h3>
                <div className='space-y-4'>
                  {configuredProviders.length > 0
                    ? (configuredProviders.map(p => (
                      <ProviderItem key={p.id} provider={p} onRemove={handleRemoveProvider} />
                    )))
                    : (
                      <div className='text-center py-8 border-2 border-dashed border-vscode-border/50 rounded-lg'>
                        <Box size={24} className='mx-auto text-vscode-text-muted/30 mb-2' />
                        <p className='text-sm text-vscode-text-muted'>
                          No providers configured yet
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className='max-w-3xl mx-auto space-y-6'>
              <header>
                <h2 className='text-lg font-medium text-vscode-text-header mb-1'>Permissions</h2>
                <p className='text-vscode-text-muted text-sm'>Control tool execution safety</p>
              </header>

              <div className='bg-vscode-element border border-vscode-border rounded-lg p-4'>
                <Select
                  label='Approval Mode'
                  description='Choose when the assistant requires your explicit approval to run tools.'
                  value={approvalMode}
                  onChange={handleApprovalModeChange}
                  options={[{value: 'none', label: 'No Approval (Auto-execute all)'}, {
                    value: 'write',
                    label: 'Write Approval (Protect files)',
                  }, {value: 'all', label: 'Full Approval (Ask for everything)'}]}
                />

                <div className='mt-4 p-4 bg-vscode-bg/50 rounded-lg border border-vscode-border/50 text-xs text-vscode-text-muted leading-relaxed'>
                  <p className='mb-2'>
                    <strong className='text-vscode-text-header'>Write Approval</strong>{' '}
                    is recommended. It allows read-only operations (searching, reading files) to run
                    automatically but asks for confirmation before modifying any files or running
                    shell commands.
                  </p>
                  <p>
                    <strong className='text-vscode-text-header'>Full Approval</strong>{' '}
                    provides maximum safety but may interrupt the workflow frequently.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'prompts' && (
            <div className='max-w-3xl mx-auto space-y-6'>
              <header>
                <h2 className='text-lg font-medium text-vscode-text-header mb-1'>Custom Prompts</h2>
                <p className='text-vscode-text-muted text-sm'>
                  Customize system prompts for different workflow modes
                </p>
              </header>

              <div className='bg-vscode-element border border-vscode-border rounded-lg p-4'>
                <Select
                  label='Workflow Mode'
                  description='Select the mode to customize.'
                  value={selectedPromptType}
                  onChange={v => handlePromptTypeChange(v as PromptType)}
                  options={[
                    {value: 'specialist', label: 'Specialist Mode'},
                    {value: 'artist', label: 'Artist Mode'},
                    {value: 'explorer', label: 'Explorer Mode'},
                    {value: 'assistant', label: 'Assistant Mode'},
                  ]}
                />

                <div className='mt-4'>
                  <div className='flex items-center justify-between mb-2'>
                    <label className='text-sm font-medium text-vscode-text-header'>
                      System Prompt
                    </label>
                    {customPrompts[selectedPromptType] !== null && (
                      <span className='text-xs text-vscode-accent'>Customized</span>
                    )}
                  </div>
                  <textarea
                    value={promptEditorValue}
                    onChange={e => setPromptEditorValue(e.target.value)}
                    placeholder={`Enter custom system prompt for ${selectedPromptType} mode...`}
                    className='w-full h-64 px-3 py-2 bg-vscode-bg border border-vscode-border rounded-lg text-sm text-vscode-text font-mono resize-none focus:outline-none focus:border-vscode-accent select-text'
                  />
                </div>

                <div className='flex gap-3 mt-4'>
                  <button
                    onClick={handleSavePrompt}
                    disabled={!promptEditorValue.trim() || isSavingPrompt}
                    className='flex-1 py-2 bg-vscode-accent hover:bg-vscode-accent/90 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2'
                  >
                    {isSavingPrompt
                      ? <Loader2 size={16} className='animate-spin' />
                      : <Save size={16} />}
                    {isSavingPrompt ? 'Saving...' : 'Save Prompt'}
                  </button>
                  <button
                    onClick={handleResetPrompt}
                    disabled={customPrompts[selectedPromptType] === null}
                    className='px-4 py-2 bg-vscode-bg hover:bg-vscode-element border border-vscode-border rounded-lg text-sm font-medium text-vscode-text-muted hover:text-vscode-text disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2'
                  >
                    <RotateCcw size={16} />
                    Reset to Default
                  </button>
                </div>

                <div className='mt-4 p-4 bg-vscode-bg/50 rounded-lg border border-vscode-border/50 text-xs text-vscode-text-muted leading-relaxed'>
                  <p className='mb-2'>
                    <strong className='text-vscode-text-header'>Specialist Mode</strong>{' '}
                    is optimized for coding tasks with specialized tools like explore, slice, and
                    ripple.
                  </p>
                  <p className='mb-2'>
                    <strong className='text-vscode-text-header'>Artist Mode</strong>{' '}
                    focuses on image generation and responds primarily through visuals.
                  </p>
                  <p className='mb-2'>
                    <strong className='text-vscode-text-header'>Explorer Mode</strong>{' '}
                    prioritizes web search to find current information before answering.
                  </p>
                  <p>
                    <strong className='text-vscode-text-header'>Assistant Mode</strong>{' '}
                    is a general-purpose conversational mode without any specialized tools or
                    workflows.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'office' && (
            <div className='max-w-3xl mx-auto space-y-6'>
              <header>
                <h2 className='text-lg font-medium text-vscode-text-header mb-1'>
                  Office Integration
                </h2>
                <p className='text-vscode-text-muted text-sm'>
                  Connect Word, Excel, and PowerPoint to OmniContext
                </p>
              </header>

              <div className='bg-vscode-element border border-vscode-border rounded-lg p-4'>
                <div className='flex items-center justify-between mb-4'>
                  <div className='flex items-center gap-3'>
                    <div
                      className={`w-3 h-3 rounded-full ${
                        officeInstalled && officeRunning
                          ? 'bg-green-500'
                          : officeInstalled
                          ? 'bg-yellow-500'
                          : 'bg-vscode-text-muted/30'
                      }`}
                    />
                    <span className='text-sm font-medium text-vscode-text-header'>
                      {officeInstalled && officeRunning
                        ? 'Running'
                        : officeInstalled
                        ? 'Installed (not running)'
                        : 'Not installed'}
                    </span>
                  </div>
                  {officeInstalled && officeRunning && (
                    <span className='text-xs text-vscode-text-muted'>HTTPS port {officePort}</span>
                  )}
                </div>

                <div className='flex gap-3'>
                  {!officeInstalled
                    ? (
                      <button
                        onClick={handleInstallOffice}
                        disabled={isOfficeLoading}
                        className='flex-1 py-2 bg-vscode-accent hover:bg-vscode-accent/90 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2'
                      >
                        {isOfficeLoading && <Loader2 size={16} className='animate-spin' />}
                        {isOfficeLoading ? 'Installing...' : 'Install Office Add-in'}
                      </button>
                    )
                    : (
                      <button
                        onClick={handleUninstallOffice}
                        disabled={isOfficeLoading}
                        className='flex-1 py-2 bg-vscode-bg hover:bg-vscode-element border border-vscode-border rounded-lg text-sm font-medium text-vscode-text-muted hover:text-vscode-text disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2'
                      >
                        {isOfficeLoading && <Loader2 size={16} className='animate-spin' />}
                        {isOfficeLoading ? 'Removing...' : 'Uninstall'}
                      </button>
                    )}
                </div>
              </div>

              <div className='p-4 bg-vscode-element/50 rounded-lg border border-vscode-border/50 text-xs text-vscode-text-muted leading-relaxed space-y-2'>
                <p>
                  <strong className='text-vscode-text-header'>How it works:</strong>{' '}
                  Installing registers the OmniContext add-in with Microsoft Office on this
                  computer. A local HTTPS server provides the add-in interface.
                </p>
                <p>
                  After installing, open any Office app (Word, Excel, or PowerPoint). You'll find
                  the <strong className='text-vscode-text-header'>OmniContext</strong>{' '}
                  button on the Home tab.
                </p>
                <p>
                  The Desktop app must be running for the add-in to work. It starts automatically
                  when you launch OmniContext Desktop.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'figma' && (
            <div className='max-w-3xl mx-auto space-y-6'>
              <header>
                <h2 className='text-lg font-medium text-vscode-text-header mb-1'>Figma Plugin</h2>
                <p className='text-vscode-text-muted text-sm'>Connect Figma to OmniContext</p>
              </header>

              <div className='bg-vscode-element border border-vscode-border rounded-lg p-4 space-y-4'>
                <div className='flex items-start gap-4'>
                  <div className='w-6 h-6 rounded-full bg-vscode-accent/10 text-vscode-accent flex items-center justify-center shrink-0 text-sm font-bold'>
                    1
                  </div>
                  <div>
                    <h3 className='text-sm font-medium text-vscode-text-header mb-1'>
                      Download the plugin
                    </h3>
                    <p className='text-xs text-vscode-text-muted mb-2'>
                      Go to the releases page and download the latest{' '}
                      <strong className='text-vscode-text-header'>OmniContext Figma</strong>{' '}
                      plugin package (.zip).
                    </p>
                    <a
                      href='https://github.com/bluenoah1991/omni-context-cli-landing/releases'
                      target='_blank'
                      className='inline-flex items-center gap-2 px-4 py-2 bg-vscode-accent hover:bg-vscode-accent/90 text-white rounded-lg text-sm font-medium transition-colors'
                    >
                      Open Releases Page
                    </a>
                  </div>
                </div>

                <div className='flex items-start gap-4'>
                  <div className='w-6 h-6 rounded-full bg-vscode-accent/10 text-vscode-accent flex items-center justify-center shrink-0 text-sm font-bold'>
                    2
                  </div>
                  <div>
                    <h3 className='text-sm font-medium text-vscode-text-header mb-1'>
                      Unzip the package
                    </h3>
                    <p className='text-xs text-vscode-text-muted'>
                      Extract the downloaded .zip file to a folder on your computer. You'll need the
                      {' '}
                      <strong className='text-vscode-text-header'>dist</strong> folder inside.
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-4'>
                  <div className='w-6 h-6 rounded-full bg-vscode-accent/10 text-vscode-accent flex items-center justify-center shrink-0 text-sm font-bold'>
                    3
                  </div>
                  <div>
                    <h3 className='text-sm font-medium text-vscode-text-header mb-1'>
                      Load in Figma
                    </h3>
                    <p className='text-xs text-vscode-text-muted'>
                      Open the{' '}
                      <strong className='text-vscode-text-header'>Figma desktop app</strong>, go to
                      the menu{' '}
                      <strong className='text-vscode-text-header'>
                        Plugins &gt; Development &gt; Import plugin from manifest...
                      </strong>{' '}
                      and select the{' '}
                      <strong className='text-vscode-text-header'>manifest.json</strong>{' '}
                      file inside the <strong className='text-vscode-text-header'>dist</strong>{' '}
                      folder.
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-4'>
                  <div className='w-6 h-6 rounded-full bg-vscode-accent/10 text-vscode-accent flex items-center justify-center shrink-0 text-sm font-bold'>
                    4
                  </div>
                  <div>
                    <h3 className='text-sm font-medium text-vscode-text-header mb-1'>Connect</h3>
                    <p className='text-xs text-vscode-text-muted'>
                      Run the plugin from{' '}
                      <strong className='text-vscode-text-header'>
                        Plugins &gt; Development &gt; OmniContext
                      </strong>{' '}
                      and enter the server address. Use{' '}
                      <strong className='text-vscode-text-header'>Serve only</strong>{' '}
                      mode to start a server from the Workspaces tab.
                    </p>
                  </div>
                </div>
              </div>

              <div className='bg-vscode-element border border-vscode-border rounded-lg p-4'>
                <h3 className='text-sm font-medium text-vscode-text-header mb-2'>Note</h3>
                <p className='text-xs text-vscode-text-muted'>
                  The Figma plugin only works in the{' '}
                  <strong className='text-vscode-text-header'>Figma desktop app</strong>. The web
                  version of Figma does not support loading local development plugins.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'browser' && (
            <div className='max-w-3xl mx-auto space-y-6'>
              <header>
                <h2 className='text-lg font-medium text-vscode-text-header mb-1'>
                  Browser Extension
                </h2>
                <p className='text-vscode-text-muted text-sm'>
                  Connect Google Chrome to OmniContext
                </p>
              </header>

              <div className='bg-vscode-element border border-vscode-border rounded-lg p-4 space-y-4'>
                <div className='flex items-start gap-4'>
                  <div className='w-6 h-6 rounded-full bg-vscode-accent/10 text-vscode-accent flex items-center justify-center shrink-0 text-sm font-bold'>
                    1
                  </div>
                  <div>
                    <h3 className='text-sm font-medium text-vscode-text-header mb-1'>
                      Download the extension
                    </h3>
                    <p className='text-xs text-vscode-text-muted mb-2'>
                      Go to the releases page and download the latest{' '}
                      <strong className='text-vscode-text-header'>OmniContext Connect</strong>{' '}
                      extension package (.zip).
                    </p>
                    <a
                      href='https://github.com/bluenoah1991/omni-context-cli-landing/releases'
                      target='_blank'
                      className='inline-flex items-center gap-2 px-4 py-2 bg-vscode-accent hover:bg-vscode-accent/90 text-white rounded-lg text-sm font-medium transition-colors'
                    >
                      Open Releases Page
                    </a>
                  </div>
                </div>

                <div className='flex items-start gap-4'>
                  <div className='w-6 h-6 rounded-full bg-vscode-accent/10 text-vscode-accent flex items-center justify-center shrink-0 text-sm font-bold'>
                    2
                  </div>
                  <div>
                    <h3 className='text-sm font-medium text-vscode-text-header mb-1'>
                      Unzip the package
                    </h3>
                    <p className='text-xs text-vscode-text-muted'>
                      Extract the downloaded .zip file to a folder on your computer. You'll need the
                      {' '}
                      <strong className='text-vscode-text-header'>dist</strong> folder inside.
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-4'>
                  <div className='w-6 h-6 rounded-full bg-vscode-accent/10 text-vscode-accent flex items-center justify-center shrink-0 text-sm font-bold'>
                    3
                  </div>
                  <div>
                    <h3 className='text-sm font-medium text-vscode-text-header mb-1'>
                      Load in Chrome
                    </h3>
                    <p className='text-xs text-vscode-text-muted'>
                      Open <strong className='text-vscode-text-header'>chrome://extensions</strong>
                      {' '}
                      in your browser, enable{' '}
                      <strong className='text-vscode-text-header'>Developer mode</strong>, click
                      {' '}
                      <strong className='text-vscode-text-header'>Load unpacked</strong>, and select
                      the <strong className='text-vscode-text-header'>dist</strong> folder.
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-4'>
                  <div className='w-6 h-6 rounded-full bg-vscode-accent/10 text-vscode-accent flex items-center justify-center shrink-0 text-sm font-bold'>
                    4
                  </div>
                  <div>
                    <h3 className='text-sm font-medium text-vscode-text-header mb-1'>Connect</h3>
                    <p className='text-xs text-vscode-text-muted'>
                      Open the extension's side panel in Chrome and enter the server address. Use
                      {' '}
                      <strong className='text-vscode-text-header'>Serve only</strong>{' '}
                      mode to start a server from the Workspaces tab.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'obsidian' && (
            <div className='max-w-3xl mx-auto space-y-6'>
              <header>
                <h2 className='text-lg font-medium text-vscode-text-header mb-1'>
                  Obsidian Plugin
                </h2>
                <p className='text-vscode-text-muted text-sm'>Connect Obsidian to OmniContext</p>
              </header>

              <div className='bg-vscode-element border border-vscode-border rounded-lg p-4 space-y-4'>
                <div className='flex items-start gap-4'>
                  <div className='w-6 h-6 rounded-full bg-vscode-accent/10 text-vscode-accent flex items-center justify-center shrink-0 text-sm font-bold'>
                    1
                  </div>
                  <div>
                    <h3 className='text-sm font-medium text-vscode-text-header mb-1'>
                      Download the plugin
                    </h3>
                    <p className='text-xs text-vscode-text-muted mb-2'>
                      Go to the releases page and download the latest{' '}
                      <strong className='text-vscode-text-header'>OmniContext Obsidian</strong>{' '}
                      plugin package (.zip).
                    </p>
                    <a
                      href='https://github.com/bluenoah1991/omni-context-cli-landing/releases'
                      target='_blank'
                      className='inline-flex items-center gap-2 px-4 py-2 bg-vscode-accent hover:bg-vscode-accent/90 text-white rounded-lg text-sm font-medium transition-colors'
                    >
                      Open Releases Page
                    </a>
                  </div>
                </div>

                <div className='flex items-start gap-4'>
                  <div className='w-6 h-6 rounded-full bg-vscode-accent/10 text-vscode-accent flex items-center justify-center shrink-0 text-sm font-bold'>
                    2
                  </div>
                  <div>
                    <h3 className='text-sm font-medium text-vscode-text-header mb-1'>
                      Unzip the package
                    </h3>
                    <p className='text-xs text-vscode-text-muted'>
                      Extract the downloaded .zip file. Inside you'll find a folder called{' '}
                      <strong className='text-vscode-text-header'>omni-context</strong> containing
                      {' '}
                      <strong className='text-vscode-text-header'>main.js</strong>,{' '}
                      <strong className='text-vscode-text-header'>manifest.json</strong>, and{' '}
                      <strong className='text-vscode-text-header'>styles.css</strong>.
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-4'>
                  <div className='w-6 h-6 rounded-full bg-vscode-accent/10 text-vscode-accent flex items-center justify-center shrink-0 text-sm font-bold'>
                    3
                  </div>
                  <div>
                    <h3 className='text-sm font-medium text-vscode-text-header mb-1'>
                      Copy to your vault
                    </h3>
                    <p className='text-xs text-vscode-text-muted'>
                      Move the <strong className='text-vscode-text-header'>omni-context</strong>
                      {' '}
                      folder into your vault's plugin directory:{' '}
                      <strong className='text-vscode-text-header'>
                        &lt;vault&gt;/.obsidian/plugins/omni-context/
                      </strong>. Create the{' '}
                      <strong className='text-vscode-text-header'>plugins</strong>{' '}
                      folder if it doesn't exist.
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-4'>
                  <div className='w-6 h-6 rounded-full bg-vscode-accent/10 text-vscode-accent flex items-center justify-center shrink-0 text-sm font-bold'>
                    4
                  </div>
                  <div>
                    <h3 className='text-sm font-medium text-vscode-text-header mb-1'>
                      Enable the plugin
                    </h3>
                    <p className='text-xs text-vscode-text-muted'>
                      Open Obsidian, go to{' '}
                      <strong className='text-vscode-text-header'>
                        Settings &gt; Community plugins
                      </strong>, and enable{' '}
                      <strong className='text-vscode-text-header'>OmniContext</strong>. You'll see a
                      chat icon in the left ribbon bar.
                    </p>
                  </div>
                </div>
              </div>

              <div className='bg-vscode-element border border-vscode-border rounded-lg p-4'>
                <h3 className='text-sm font-medium text-vscode-text-header mb-2'>Note</h3>
                <p className='text-xs text-vscode-text-muted'>
                  The plugin is desktop-only and requires the OmniContext CLI to be installed. It
                  launches a local server automatically when you open the panel. Obsidian plugins
                  are vault-scoped, so you'll need to install it separately for each vault or use a
                  symlink to share a single copy.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
