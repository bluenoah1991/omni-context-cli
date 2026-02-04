import {
  AlertCircle,
  Box,
  CheckCircle2,
  FolderOpen,
  LayoutGrid,
  Loader2,
  type LucideIcon,
  Monitor,
  Rocket,
  Shield,
  X,
} from 'lucide-react';
import { memo, useEffect } from 'react';
import { ProviderItem } from './components/ProviderItem';
import { Select } from './components/Select';
import { addProviderModels, removeProviderModels } from './providers';
import { usePortalStore } from './store/portalStore';
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
        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
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
  } = usePortalStore();

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

      window.electronAPI.launch(selectedWorkspace, approvalMode);
    } catch (e) {
      console.error('Failed to launch:', e);
    }
  };

  if (loading) {
    return (
      <div className='h-screen w-screen bg-vscode-bg flex items-center justify-center text-vscode-text'>
        <Loader2 className='animate-spin mr-2' /> Loading...
      </div>
    );
  }

  return (
    <div className='h-screen w-screen bg-vscode-bg text-vscode-text flex overflow-hidden font-sans'>
      <div className='w-64 bg-vscode-sidebar border-r border-vscode-border flex flex-col shrink-0'>
        <div className='p-6'>
          <h1 className='text-lg font-semibold text-vscode-text-header flex items-center gap-2'>
            <Monitor size={20} className='text-vscode-accent' />
            OmniContext
          </h1>
        </div>

        <nav className='flex-1 py-2'>
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
        </nav>

        <div className='p-4 border-t border-vscode-border bg-vscode-element/10'>
          <div className='mb-4 space-y-2'>
            <div className='flex items-center gap-2 text-xs'>
              {selectedWorkspace
                ? <FolderOpen size={14} className='text-vscode-accent shrink-0' />
                : <AlertCircle size={14} className='text-vscode-error shrink-0' />}
              <span
                className={`truncate ${
                  selectedWorkspace ? 'text-vscode-text-header' : 'text-vscode-text-muted'
                }`}
                title={selectedWorkspace}
              >
                {selectedWorkspace ? selectedWorkspace.split(/[/\\]/).pop() : 'No workspace'}
              </span>
            </div>
            <div className='flex items-center gap-2 text-xs'>
              {omxConfig.models.length > 0
                ? <Box size={14} className='text-vscode-accent shrink-0' />
                : <AlertCircle size={14} className='text-vscode-error shrink-0' />}
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
            <div className='flex items-center gap-2 text-xs'>
              <Shield
                size={14}
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

          <button
            onClick={handleLaunch}
            disabled={!canLaunch}
            className='w-full py-3 bg-vscode-accent hover:bg-vscode-accent/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white shadow-lg transition-all flex items-center justify-center gap-2 font-medium text-sm'
          >
            <Rocket size={16} />
            Launch
          </button>
        </div>
      </div>

      <div className='flex-1 flex flex-col min-w-0 bg-vscode-bg overflow-hidden'>
        <div className='flex-1 overflow-y-auto p-8 md:p-12'>
          {activeTab === 'workspaces' && (
            <div className='max-w-2xl mx-auto w-full space-y-8'>
              <header>
                <h2 className='text-2xl font-light text-vscode-text-header mb-2'>Workspaces</h2>
                <p className='text-vscode-text-muted'>Open a folder or select a recent project</p>
              </header>

              <div className='space-y-8'>
                <div>
                  <h3 className='text-xs font-semibold text-vscode-text-muted uppercase tracking-wider mb-3'>
                    Start
                  </h3>
                  <button
                    onClick={handleBrowse}
                    className='w-full p-4 bg-vscode-element hover:bg-vscode-element/80 border border-vscode-border hover:border-vscode-accent rounded-lg text-left transition-all group flex items-center gap-4'
                  >
                    <div className='p-2.5 rounded-lg bg-vscode-accent/10 text-vscode-accent group-hover:bg-vscode-accent group-hover:text-white transition-colors'>
                      <FolderOpen size={24} />
                    </div>
                    <div>
                      <div className='text-base font-medium text-vscode-text-header group-hover:text-vscode-accent transition-colors'>
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
                    <h3 className='text-xs font-semibold text-vscode-text-muted uppercase tracking-wider mb-3'>
                      Recent
                    </h3>
                    <div className='space-y-2'>
                      {desktopConfig.workspaces.map(ws => (
                        <div
                          key={ws.path}
                          className={`w-full p-3 rounded-lg border transition-all flex items-center gap-3 group ${
                            selectedWorkspace === ws.path
                              ? 'bg-vscode-accent/10 border-vscode-accent'
                              : 'bg-transparent border-transparent hover:bg-vscode-element'
                          }`}
                        >
                          <button
                            onClick={() => setSelectedWorkspace(ws.path)}
                            className='flex items-center gap-3 flex-1 min-w-0 text-left'
                          >
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
                          </button>
                          {selectedWorkspace === ws.path
                            ? <CheckCircle2 size={16} className='text-vscode-accent shrink-0' />
                            : ws.path !== desktopConfig.defaultWorkspace && (
                              <button
                                onClick={() => handleRemoveWorkspace(ws.path)}
                                className='p-1 rounded text-vscode-text-muted hover:text-vscode-error hover:bg-vscode-error/10 transition-colors opacity-0 group-hover:opacity-100'
                                title='Remove from list'
                              >
                                <X size={14} />
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
            <div className='max-w-2xl mx-auto space-y-8'>
              <header className='flex items-center justify-between'>
                <div>
                  <h2 className='text-2xl font-light text-vscode-text-header mb-2'>
                    Model Providers
                  </h2>
                  <p className='text-vscode-text-muted'>Configure LLM API providers</p>
                </div>
                {omxConfig.models.length === 0 && (
                  <div className='px-3 py-1 bg-vscode-error/20 text-vscode-error text-xs rounded-full border border-vscode-error/20'>
                    Required
                  </div>
                )}
              </header>

              <div className='bg-vscode-element border border-vscode-border rounded-lg p-5 shadow-sm'>
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
                    className='w-full px-3 py-2.5 bg-vscode-bg border border-vscode-border rounded-lg text-sm text-vscode-text focus:outline-none focus:border-vscode-accent'
                  />
                </div>
                <button
                  onClick={handleAddProvider}
                  disabled={!selectedProvider || !apiKey || isAddingProvider}
                  className='px-6 py-2 bg-vscode-accent hover:bg-vscode-accent/90 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 w-full md:w-auto'
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
                <div className='space-y-3'>
                  {configuredProviders.length > 0
                    ? (configuredProviders.map(p => (
                      <ProviderItem key={p.id} provider={p} onRemove={handleRemoveProvider} />
                    )))
                    : (
                      <div className='text-center py-10 border-2 border-dashed border-vscode-border/50 rounded-lg'>
                        <Box size={32} className='mx-auto text-vscode-text-muted/30 mb-2' />
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
            <div className='max-w-2xl mx-auto space-y-8'>
              <header>
                <h2 className='text-2xl font-light text-vscode-text-header mb-2'>Permissions</h2>
                <p className='text-vscode-text-muted'>Control tool execution safety</p>
              </header>

              <div className='bg-vscode-element border border-vscode-border rounded-lg p-5'>
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

                <div className='mt-6 p-4 bg-vscode-bg/50 rounded-lg border border-vscode-border/50 text-xs text-vscode-text-muted leading-relaxed'>
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
        </div>
      </div>
    </div>
  );
}
