import {
  AlertCircle,
  Box,
  Cable,
  CheckCircle2,
  Chrome,
  ClipboardCopy,
  ExternalLink,
  Figma,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Gem,
  LayoutGrid,
  Loader2,
  type LucideIcon,
  Pencil,
  Plus,
  Rocket,
  RotateCcw,
  Save,
  Search,
  Settings,
  Shield,
  Smartphone,
  Square,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import { ProviderItem } from './components/ProviderItem';
import { Select } from './components/Select';
import { getLocale, SUPPORTED_LANGUAGES } from './i18n';
import { addProviderModels, removeProviderModels } from './providers';
import { type CustomPrompts, type PromptType, usePortalStore } from './store/portalStore';
import type { ApprovalMode, MCPConfig, MCPServerConfig, Tab } from './types/config';

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

const Fmt = memo(function Fmt({text}: {text: string;}) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i} className='text-vscode-text-header'>{part}</strong> : part
      )}
    </>
  );
});

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
    lanAccess,
    fixedPort,
    language,
    mcpConfig,
    skills,
    setLanAccess,
    setFixedPort,
    setLanguage,
    setMcpConfig,
    setSkills,
  } = usePortalStore();

  const t = useMemo(() => getLocale(language), [language]);

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
  const [mcpFormOpen, setMcpFormOpen] = useState(false);
  const [mcpEditingKey, setMcpEditingKey] = useState<string | null>(null);
  const [mcpFormName, setMcpFormName] = useState('');
  const [mcpFormType, setMcpFormType] = useState<'stdio' | 'http'>('stdio');
  const [mcpFormCommand, setMcpFormCommand] = useState('');
  const [mcpFormArgs, setMcpFormArgs] = useState('');
  const [mcpFormUrl, setMcpFormUrl] = useState('');
  const [mcpFormEnv, setMcpFormEnv] = useState<Array<{key: string; value: string;}>>([]);
  const [mcpFormHeaders, setMcpFormHeaders] = useState<Array<{key: string; value: string;}>>([]);
  const [mcpFormError, setMcpFormError] = useState('');
  const [registryServers, setRegistryServers] = useState<any[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState('');
  const [registryCursor, setRegistryCursor] = useState<string | null>(null);
  const [registryLoaded, setRegistryLoaded] = useState(false);
  const [registrySearch, setRegistrySearch] = useState('');

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
      setLanAccess(desktop.lanAccess ?? false);
      setFixedPort(desktop.fixedPort ?? null);
      setLanguage(desktop.language ?? 'en-US');

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

      const mcpCfg = await window.electronAPI.getMcpConfig();
      setMcpConfig(mcpCfg);

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
      setProviderError(err instanceof Error ? err.message : t.models.addProviderFailed);
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

  const resetMcpForm = () => {
    setMcpFormOpen(false);
    setMcpEditingKey(null);
    setMcpFormName('');
    setMcpFormType('stdio');
    setMcpFormCommand('');
    setMcpFormArgs('');
    setMcpFormUrl('');
    setMcpFormEnv([]);
    setMcpFormHeaders([]);
    setMcpFormError('');
  };

  const openMcpForm = (key?: string) => {
    if (key && mcpConfig.mcpServers[key]) {
      const cfg = mcpConfig.mcpServers[key];
      setMcpEditingKey(key);
      setMcpFormName(key);
      setMcpFormType(cfg.url ? 'http' : 'stdio');
      setMcpFormCommand(cfg.command ?? '');
      setMcpFormArgs((cfg.args ?? []).join(' '));
      setMcpFormUrl(cfg.url ?? '');
      setMcpFormEnv(Object.entries(cfg.env ?? {}).map(([k, v]) => ({key: k, value: v})));
      setMcpFormHeaders(Object.entries(cfg.headers ?? {}).map(([k, v]) => ({key: k, value: v})));
    } else {
      setMcpEditingKey(null);
      setMcpFormName('');
      setMcpFormType('stdio');
      setMcpFormCommand('');
      setMcpFormArgs('');
      setMcpFormUrl('');
      setMcpFormEnv([]);
      setMcpFormHeaders([]);
    }
    setMcpFormOpen(true);
  };

  const handleMcpSave = async () => {
    const name = mcpFormName.trim();
    if (!name) return;

    const serverConfig: MCPServerConfig = {};
    if (mcpFormType === 'stdio') {
      serverConfig.command = mcpFormCommand.trim();
      const args = mcpFormArgs.trim();
      if (args) serverConfig.args = args.split(/\s+/);
    } else {
      serverConfig.url = mcpFormUrl.trim();
    }

    if (mcpFormType === 'stdio') {
      const env: Record<string, string> = {};
      for (const e of mcpFormEnv) {
        if (e.key.trim()) env[e.key.trim()] = e.value;
      }
      if (Object.keys(env).length > 0) serverConfig.env = env;
    }

    if (mcpFormType === 'http') {
      const headers: Record<string, string> = {};
      for (const h of mcpFormHeaders) {
        if (h.key.trim()) headers[h.key.trim()] = h.value;
      }
      if (Object.keys(headers).length > 0) serverConfig.headers = headers;
    }

    const newServers = {...mcpConfig.mcpServers};
    const isRename = mcpEditingKey && mcpEditingKey !== name;
    const isNew = !mcpEditingKey;
    if ((isRename || isNew) && newServers[name]) {
      setMcpFormError(t.mcp.nameExists);
      return;
    }
    if (isRename) delete newServers[mcpEditingKey];
    newServers[name] = serverConfig;

    const newConfig: MCPConfig = {mcpServers: newServers};
    setMcpConfig(newConfig);
    await window.electronAPI.saveMcpConfig(newConfig);
    resetMcpForm();
  };

  const handleMcpRemove = async (key: string) => {
    const newServers = {...mcpConfig.mcpServers};
    delete newServers[key];
    const newConfig: MCPConfig = {mcpServers: newServers};
    setMcpConfig(newConfig);
    await window.electronAPI.saveMcpConfig(newConfig);
  };

  const loadRegistry = async (search?: string, cursor?: string) => {
    setRegistryLoading(true);
    setRegistryError('');
    try {
      const q = search?.trim() || undefined;
      const result = await window.electronAPI.fetchMcpRegistry(cursor, q);
      if (result.error) throw new Error(result.error);
      const servers = result.servers ?? [];
      if (cursor) {
        setRegistryServers(prev => [...prev, ...servers]);
      } else {
        setRegistryServers(servers);
      }
      setRegistryCursor(result.metadata?.nextCursor ?? null);
      setRegistryLoaded(true);
    } catch (e: any) {
      setRegistryError(e.message || 'Unknown error');
    } finally {
      setRegistryLoading(false);
    }
  };

  const getRegistryEntrySupport = (entry: any): 'supported' | 'sse-only' => {
    const server = entry.server;
    if ((server.packages ?? []).length > 0) return 'supported';
    const remotes = server.remotes ?? [];
    if (remotes.some((r: any) => r.type === 'streamable-http')) return 'supported';
    if (remotes.length > 0 && remotes.every((r: any) => r.type === 'sse')) return 'sse-only';
    return 'supported';
  };

  const handleRegistryInstall = (entry: any) => {
    const server = entry.server;
    const name = (server.name ?? '').split('/').pop() || server.name || '';

    const pkg = (server.packages ?? [])[0];
    if (pkg) {
      const registryCommands: Record<string, string> = {npm: 'npx', pypi: 'uvx', oci: 'docker'};
      const cmd = pkg.runtimeHint ?? registryCommands[pkg.registryType] ?? '';
      const id = pkg.identifier ?? pkg.name ?? '';
      const serializeArgs = (args: any[]) =>
        args.flatMap((a: any) => {
          if (!a.value) return [];
          return a.type === 'named' && a.name ? [a.name, a.value] : [a.value];
        });
      const runtimeArgs = serializeArgs(pkg.runtimeArguments ?? []);
      const packageArgs = serializeArgs(pkg.packageArguments ?? []);
      setMcpFormName(name);
      setMcpFormType('stdio');
      setMcpFormCommand(cmd);
      setMcpFormArgs([...runtimeArgs, id, ...packageArgs].join(' '));
      setMcpFormUrl('');
      setMcpFormEnv(
        (pkg.environmentVariables ?? []).map((e: any) => ({key: e.name ?? '', value: ''})),
      );
      setMcpFormHeaders([]);
      setMcpEditingKey(null);
      setMcpFormOpen(true);
      return;
    }

    const remotes = server.remotes ?? [];
    const httpRemote = remotes.find((r: any) => r.type === 'streamable-http') ?? remotes[0];
    if (httpRemote) {
      setMcpFormName(name);
      setMcpFormType('http');
      setMcpFormCommand('');
      setMcpFormArgs('');
      setMcpFormUrl(httpRemote.url ?? '');
      setMcpFormEnv([]);
      setMcpFormHeaders(
        (httpRemote.headers ?? []).map((h: any) => ({key: h.name ?? '', value: h.value ?? ''})),
      );
      setMcpEditingKey(null);
      setMcpFormOpen(true);
      return;
    }

    setMcpFormName(name);
    setMcpFormType('stdio');
    setMcpFormCommand('');
    setMcpFormArgs('');
    setMcpFormUrl('');
    setMcpFormEnv([]);
    setMcpFormHeaders([]);
    setMcpEditingKey(null);
    setMcpFormOpen(true);
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
          {lanAccess, fixedPort, language},
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
        <Loader2 className='animate-spin mr-2' /> {t.loading}
      </div>
    );
  }

  return (
    <div
      className='h-screen w-screen bg-vscode-bg text-vscode-text flex overflow-hidden font-sans select-none'
      spellCheck={false}
    >
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
            label={t.nav.workspaces}
            activeTab={activeTab}
            onClick={setActiveTab}
          />
          <NavItem
            id='models'
            icon={Box}
            label={t.nav.models}
            alert={omxConfig.models.length === 0}
            activeTab={activeTab}
            onClick={setActiveTab}
          />
          <NavItem
            id='mcp'
            icon={Cable}
            label={t.nav.mcp}
            activeTab={activeTab}
            onClick={tab => {
              setActiveTab(tab);
              if (!registryLoaded && !registryLoading) loadRegistry();
            }}
          />
          <NavItem
            id='skills'
            icon={Wand2}
            label={t.nav.skills}
            activeTab={activeTab}
            onClick={async tab => {
              setActiveTab(tab);
              setSkills(await window.electronAPI.getSkills());
            }}
          />
          <NavItem
            id='office'
            icon={FileSpreadsheet}
            label={t.nav.office}
            activeTab={activeTab}
            onClick={setActiveTab}
          />
          <NavItem
            id='browser'
            icon={Chrome}
            label={t.nav.browser}
            activeTab={activeTab}
            onClick={setActiveTab}
          />
          <NavItem
            id='obsidian'
            icon={Gem}
            label={t.nav.obsidian}
            activeTab={activeTab}
            onClick={setActiveTab}
          />
          <NavItem
            id='figma'
            icon={Figma}
            label={t.nav.figma}
            activeTab={activeTab}
            onClick={setActiveTab}
          />
          <NavItem
            id='mobile'
            icon={Smartphone}
            label={t.nav.mobile}
            activeTab={activeTab}
            onClick={setActiveTab}
          />
          <NavItem
            id='prompts'
            icon={FileText}
            label={t.nav.prompts}
            activeTab={activeTab}
            onClick={setActiveTab}
          />
          <NavItem
            id='settings'
            icon={Settings}
            label={t.nav.settings}
            activeTab={activeTab}
            onClick={setActiveTab}
          />
        </nav>

        <div className='px-5 py-8 border-t border-vscode-border bg-vscode-element/10'>
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
                      <span className='text-vscode-text-header'>
                        {t.sidebar.models(serveSnapshot.models)}
                      </span>
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
                          ? t.sidebar.noApproval
                          : serveSnapshot.approval === 'write'
                          ? t.sidebar.writeApproval
                          : t.sidebar.fullApproval}
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
                  title={t.sidebar.clickToCopy}
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
                <p className='text-xs text-vscode-text-muted'>{t.sidebar.pasteUrl}</p>

                <button
                  onClick={handleStopServe}
                  className='w-full px-5 py-3 bg-vscode-bg hover:bg-vscode-element border border-vscode-border rounded-lg text-vscode-text-muted hover:text-vscode-text transition-colors flex items-center justify-center gap-2 text-base font-medium'
                >
                  <Square size={18} />
                  {t.sidebar.stopServing}
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
                      {selectedWorkspace
                        ? selectedWorkspace.split(/[/\\]/).pop()
                        : t.sidebar.noWorkspace}
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
                        ? t.sidebar.modelsReady(omxConfig.models.length)
                        : t.sidebar.noModels}
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
                        ? t.sidebar.noApproval
                        : approvalMode === 'write'
                        ? t.sidebar.writeApproval
                        : t.sidebar.fullApproval}
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
                  <span className='text-vscode-text-muted'>{t.sidebar.serveOnly}</span>
                </label>

                <button
                  onClick={handleLaunch}
                  disabled={!canLaunch}
                  className='w-full px-5 py-3 bg-vscode-accent hover:bg-vscode-accent/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors flex items-center justify-center gap-2 text-base font-medium'
                >
                  <Rocket size={18} />
                  {serveOnly ? t.sidebar.startServing : t.sidebar.launch}
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
                <h2 className='text-lg font-medium text-vscode-text-header mb-1'>
                  {t.workspaces.title}
                </h2>
                <p className='text-vscode-text-muted text-sm'>{t.workspaces.description}</p>
              </header>

              <div className='space-y-6'>
                <div>
                  <h3 className='text-sm font-medium text-vscode-text-header mb-3'>
                    {t.workspaces.start}
                  </h3>
                  <button
                    onClick={handleBrowse}
                    className='w-full p-4 bg-vscode-element hover:bg-vscode-element/80 border border-vscode-border hover:border-vscode-accent rounded-lg text-left transition-all group'
                  >
                    <div className='text-sm font-medium text-vscode-text-header group-hover:text-vscode-accent transition-colors'>
                      {t.workspaces.openFolder}
                    </div>
                    <div className='text-vscode-text-muted text-sm mt-0.5'>
                      {t.workspaces.browseFileSystem}
                    </div>
                  </button>
                </div>

                {desktopConfig.workspaces.length > 0 && (
                  <div>
                    <h3 className='text-sm font-medium text-vscode-text-header mb-3'>
                      {t.workspaces.recent}
                    </h3>
                    <div className='space-y-2'>
                      {desktopConfig.workspaces.map(ws => (
                        <div
                          key={ws.path}
                          onClick={() => setSelectedWorkspace(ws.path)}
                          className={`w-full p-4 rounded-lg border transition-all flex items-center gap-4 group cursor-pointer ${
                            selectedWorkspace === ws.path
                              ? 'bg-vscode-accent/10 border-vscode-accent'
                              : 'bg-vscode-element border-vscode-border hover:bg-vscode-element/80'
                          }`}
                        >
                          <div className='flex-1 min-w-0 text-left'>
                            <div
                              className={`text-sm font-medium truncate ${
                                selectedWorkspace === ws.path
                                  ? 'text-vscode-accent'
                                  : 'text-vscode-text-header'
                              }`}
                            >
                              {ws.name}
                            </div>
                            <div className='text-sm text-vscode-text-muted truncate opacity-70'>
                              {ws.path}
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
                                title={t.workspaces.removeFromList}
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
                    {t.models.title}
                  </h2>
                  <p className='text-vscode-text-muted text-sm'>{t.models.description}</p>
                </div>
                {omxConfig.models.length === 0 && (
                  <div className='px-3 py-1 bg-vscode-error/20 text-vscode-error text-xs rounded-full border border-vscode-error/20'>
                    {t.models.required}
                  </div>
                )}
              </header>

              <div className='bg-vscode-element border border-vscode-border rounded-lg p-4'>
                <h3 className='text-sm font-medium text-vscode-text-header mb-4'>
                  {t.models.addNewProvider}
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
                  <Select
                    label=''
                    value={selectedProvider}
                    onChange={setSelectedProvider}
                    options={availableProviders}
                    placeholder={t.models.selectProvider}
                  />
                  <input
                    type='password'
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={t.models.enterApiKey}
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
                  {isAddingProvider ? t.models.adding : t.models.addProvider}
                </button>
                {providerError && (
                  <div className='mt-3 text-xs text-vscode-error flex items-center gap-2'>
                    <AlertCircle size={14} />
                    {providerError}
                  </div>
                )}
              </div>

              <div className='space-y-4'>
                <h3 className='text-sm font-medium text-vscode-text-header'>
                  {t.models.configured}
                </h3>
                <div className='space-y-4'>
                  {configuredProviders.length > 0
                    ? (configuredProviders.map(p => (
                      <ProviderItem
                        key={p.id}
                        provider={p}
                        onRemove={handleRemoveProvider}
                        formatModelCount={t.models.modelCount}
                        removeTitle={t.models.removeProvider}
                      />
                    )))
                    : (
                      <div className='text-center py-8 border-2 border-dashed border-vscode-border/50 rounded-lg'>
                        <Box size={24} className='mx-auto text-vscode-text-muted/30 mb-2' />
                        <p className='text-sm text-vscode-text-muted'>{t.models.noProviders}</p>
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mcp' && (() => {
            const serverEntries = Object.entries(mcpConfig.mcpServers);

            return (
              <div className='max-w-3xl mx-auto space-y-6'>
                <header>
                  <h2 className='text-lg font-medium text-vscode-text-header mb-1'>
                    {t.mcp.title}
                  </h2>
                  <p className='text-vscode-text-muted text-sm'>{t.mcp.description}</p>
                </header>

                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <h3 className='text-sm font-medium text-vscode-text-header'>
                      {t.mcp.configured}
                    </h3>
                    <button
                      onClick={() => openMcpForm()}
                      className='flex items-center gap-2 px-4 py-2 bg-vscode-accent hover:bg-vscode-accent/90 text-white rounded-lg text-sm font-medium transition-colors'
                    >
                      <Plus size={16} />
                      {t.mcp.addManually}
                    </button>
                  </div>

                  {serverEntries.length > 0
                    ? (
                      <div className='space-y-2'>
                        {serverEntries.map(([key, cfg]) => (
                          <div
                            key={key}
                            className='bg-vscode-element border border-vscode-border rounded-lg p-4 flex items-center gap-4 group'
                          >
                            <div className='flex-1 min-w-0'>
                              <div className='text-sm font-medium text-vscode-text-header truncate'>
                                {key}
                              </div>
                              <div className='text-sm text-vscode-text-muted truncate mt-0.5'>
                                {cfg.url ? cfg.url : [cfg.command, ...(cfg.args ?? [])].join(' ')}
                              </div>
                            </div>
                            <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                              <button
                                onClick={() => openMcpForm(key)}
                                className='p-1.5 rounded text-vscode-text-muted hover:text-vscode-accent hover:bg-vscode-accent/10 transition-colors'
                                title={t.mcp.edit}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleMcpRemove(key)}
                                className='p-1.5 rounded text-vscode-text-muted hover:text-vscode-error hover:bg-vscode-error/10 transition-colors'
                                title={t.mcp.remove}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                    : !mcpFormOpen && (
                      <div className='text-center py-8 border-2 border-dashed border-vscode-border/50 rounded-lg'>
                        <Cable size={24} className='mx-auto text-vscode-text-muted/30 mb-2' />
                        <p className='text-sm text-vscode-text-muted'>{t.mcp.noServers}</p>
                      </div>
                    )}
                </div>

                {mcpFormOpen && (
                  <div className='bg-vscode-element border border-vscode-border rounded-lg p-4 space-y-4'>
                    <h3 className='text-sm font-medium text-vscode-text-header'>
                      {mcpEditingKey ? t.mcp.edit : t.mcp.addServer}
                    </h3>

                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <label className='block text-sm font-medium text-vscode-text mb-1.5'>
                          {t.mcp.serverName}
                        </label>
                        <input
                          value={mcpFormName}
                          onChange={e => {
                            setMcpFormName(e.target.value);
                            setMcpFormError('');
                          }}
                          placeholder={t.mcp.serverNamePlaceholder}
                          className={`w-full px-3 py-2 bg-vscode-bg border rounded-lg text-sm text-vscode-text focus:outline-none focus:border-vscode-accent select-text ${
                            mcpFormError ? 'border-vscode-error' : 'border-vscode-border'
                          }`}
                        />
                        {mcpFormError && (
                          <p className='text-xs text-vscode-error mt-1'>{mcpFormError}</p>
                        )}
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-vscode-text mb-1.5'>
                          {t.mcp.type}
                        </label>
                        <Select
                          label=''
                          value={mcpFormType}
                          onChange={v => setMcpFormType(v as 'stdio' | 'http')}
                          options={[{value: 'stdio', label: t.mcp.stdio}, {
                            value: 'http',
                            label: t.mcp.http,
                          }]}
                        />
                      </div>
                    </div>

                    {mcpFormType === 'stdio'
                      ? (
                        <div className='grid grid-cols-2 gap-4'>
                          <div>
                            <label className='block text-sm font-medium text-vscode-text mb-1.5'>
                              {t.mcp.command}
                            </label>
                            <input
                              value={mcpFormCommand}
                              onChange={e => setMcpFormCommand(e.target.value)}
                              placeholder={t.mcp.commandPlaceholder}
                              className='w-full px-3 py-2 bg-vscode-bg border border-vscode-border rounded-lg text-sm text-vscode-text focus:outline-none focus:border-vscode-accent select-text'
                            />
                          </div>
                          <div>
                            <label className='block text-sm font-medium text-vscode-text mb-1.5'>
                              {t.mcp.args}
                            </label>
                            <input
                              value={mcpFormArgs}
                              onChange={e => setMcpFormArgs(e.target.value)}
                              placeholder={t.mcp.argsPlaceholder}
                              className='w-full px-3 py-2 bg-vscode-bg border border-vscode-border rounded-lg text-sm text-vscode-text focus:outline-none focus:border-vscode-accent select-text'
                            />
                          </div>
                        </div>
                      )
                      : (
                        <div>
                          <label className='block text-sm font-medium text-vscode-text mb-1.5'>
                            {t.mcp.url}
                          </label>
                          <input
                            value={mcpFormUrl}
                            onChange={e => setMcpFormUrl(e.target.value)}
                            placeholder={t.mcp.urlPlaceholder}
                            className='w-full px-3 py-2 bg-vscode-bg border border-vscode-border rounded-lg text-sm text-vscode-text focus:outline-none focus:border-vscode-accent select-text'
                          />
                        </div>
                      )}

                    {mcpFormType === 'stdio' && (
                      <div>
                        <div className='flex items-center justify-between mb-2'>
                          <label className='text-sm font-medium text-vscode-text'>
                            {t.mcp.envVars}
                          </label>
                          <button
                            onClick={() => setMcpFormEnv([...mcpFormEnv, {key: '', value: ''}])}
                            className='text-sm text-vscode-accent hover:text-vscode-accent/80 transition-colors'
                          >
                            + {t.mcp.addEnvVar}
                          </button>
                        </div>
                        {mcpFormEnv.map((env, i) => (
                          <div key={i} className='flex items-center gap-2 mb-2'>
                            <input
                              value={env.key}
                              onChange={e => {
                                const next = [...mcpFormEnv];
                                next[i] = {...next[i], key: e.target.value};
                                setMcpFormEnv(next);
                              }}
                              placeholder={t.mcp.envKeyPlaceholder}
                              className='flex-1 px-3 py-2 bg-vscode-bg border border-vscode-border rounded-lg text-sm text-vscode-text font-mono focus:outline-none focus:border-vscode-accent select-text'
                            />
                            <input
                              value={env.value}
                              onChange={e => {
                                const next = [...mcpFormEnv];
                                next[i] = {...next[i], value: e.target.value};
                                setMcpFormEnv(next);
                              }}
                              placeholder={t.mcp.envValuePlaceholder}
                              className='flex-1 px-3 py-2 bg-vscode-bg border border-vscode-border rounded-lg text-sm text-vscode-text font-mono focus:outline-none focus:border-vscode-accent select-text'
                            />
                            <button
                              onClick={() =>
                                setMcpFormEnv(mcpFormEnv.filter((_, j) => j !== i))}
                              className='p-1.5 rounded text-vscode-text-muted hover:text-vscode-error hover:bg-vscode-error/10 transition-colors'
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {mcpFormType === 'http' && (
                      <div>
                        <div className='flex items-center justify-between mb-2'>
                          <label className='text-sm font-medium text-vscode-text'>
                            {t.mcp.headers}
                          </label>
                          <button
                            onClick={() =>
                              setMcpFormHeaders([...mcpFormHeaders, {key: '', value: ''}])}
                            className='text-sm text-vscode-accent hover:text-vscode-accent/80 transition-colors'
                          >
                            + {t.mcp.addHeader}
                          </button>
                        </div>
                        {mcpFormHeaders.map((header, i) => (
                          <div key={i} className='flex items-center gap-2 mb-2'>
                            <input
                              value={header.key}
                              onChange={e => {
                                const next = [...mcpFormHeaders];
                                next[i] = {...next[i], key: e.target.value};
                                setMcpFormHeaders(next);
                              }}
                              placeholder={t.mcp.headerKeyPlaceholder}
                              className='flex-1 px-3 py-2 bg-vscode-bg border border-vscode-border rounded-lg text-sm text-vscode-text font-mono focus:outline-none focus:border-vscode-accent select-text'
                            />
                            <input
                              value={header.value}
                              onChange={e => {
                                const next = [...mcpFormHeaders];
                                next[i] = {...next[i], value: e.target.value};
                                setMcpFormHeaders(next);
                              }}
                              placeholder={t.mcp.headerValuePlaceholder}
                              className='flex-1 px-3 py-2 bg-vscode-bg border border-vscode-border rounded-lg text-sm text-vscode-text font-mono focus:outline-none focus:border-vscode-accent select-text'
                            />
                            <button
                              onClick={() =>
                                setMcpFormHeaders(mcpFormHeaders.filter((_, j) => j !== i))}
                              className='p-1.5 rounded text-vscode-text-muted hover:text-vscode-error hover:bg-vscode-error/10 transition-colors'
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className='flex gap-3'>
                      <button
                        onClick={handleMcpSave}
                        disabled={!mcpFormName.trim()
                          || (mcpFormType === 'stdio' && !mcpFormCommand.trim())
                          || (mcpFormType === 'http' && !mcpFormUrl.trim())}
                        className='px-4 py-2 bg-vscode-accent hover:bg-vscode-accent/90 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-all'
                      >
                        {t.mcp.save}
                      </button>
                      <button
                        onClick={resetMcpForm}
                        className='px-4 py-2 bg-vscode-bg hover:bg-vscode-element border border-vscode-border rounded-lg text-sm font-medium text-vscode-text-muted hover:text-vscode-text transition-all'
                      >
                        {t.mcp.cancel}
                      </button>
                    </div>
                  </div>
                )}

                <div className='space-y-4'>
                  <div>
                    <h3 className='text-sm font-medium text-vscode-text-header mb-1'>
                      {t.mcp.marketplace}
                    </h3>
                    <p className='text-sm text-vscode-text-muted'>{t.mcp.marketplaceDescription}</p>
                  </div>

                  <div className='relative'>
                    <Search
                      size={14}
                      className='absolute left-3 top-1/2 -translate-y-1/2 text-vscode-text-muted'
                    />
                    <input
                      value={registrySearch}
                      onChange={e => {
                        const v = e.target.value;
                        setRegistrySearch(v);
                        if (!v.trim()) loadRegistry();
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          loadRegistry(registrySearch);
                        }
                      }}
                      placeholder={t.mcp.search}
                      className='w-full pl-9 pr-8 py-2 bg-vscode-element border border-vscode-border rounded-lg text-sm text-vscode-text focus:outline-none focus:border-vscode-accent select-text'
                    />
                    {registrySearch && (
                      <button
                        onClick={() => {
                          setRegistrySearch('');
                          loadRegistry();
                        }}
                        className='absolute right-3 top-1/2 -translate-y-1/2 text-vscode-text-muted hover:text-vscode-text transition-colors'
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {registryError && (
                    <div className='text-center py-6'>
                      <p className='text-sm text-vscode-error mb-2'>{t.mcp.loadError}</p>
                      <button
                        onClick={() => loadRegistry(registrySearch)}
                        className='px-4 py-2 bg-vscode-element hover:bg-vscode-element/80 border border-vscode-border rounded-lg text-sm text-vscode-text transition-colors'
                      >
                        {t.mcp.retry}
                      </button>
                    </div>
                  )}

                  {registryServers.length > 0 && (
                    <div className='space-y-2'>
                      {registryServers.map((entry: any, i: number) => {
                        const s = entry.server;
                        const displayName = s.title || (s.name ?? '').split('/').pop() || s.name;
                        const isInstalled = Object.keys(mcpConfig.mcpServers).some(k =>
                          k === (s.name ?? '').split('/').pop()
                        );
                        const support = getRegistryEntrySupport(entry);
                        const isSseOnly = support === 'sse-only';
                        const isDisabled = isInstalled || isSseOnly;

                        return (
                          <div
                            key={s.name ?? i}
                            className='bg-vscode-element border border-vscode-border rounded-lg p-4 flex items-start gap-4'
                          >
                            <div className='flex-1 min-w-0'>
                              <div className='flex items-center gap-2'>
                                <span className='text-sm font-medium text-vscode-text-header truncate'>
                                  {displayName}
                                </span>
                                {s.version && (
                                  <span className='text-xs text-vscode-text-muted shrink-0'>
                                    v{s.version}
                                  </span>
                                )}
                              </div>
                              <p className='text-sm text-vscode-text-muted mt-1 line-clamp-2'>
                                {s.description}
                              </p>
                              {s.repository?.url && (
                                <a
                                  href={s.repository.url}
                                  target='_blank'
                                  className='inline-flex items-center gap-1 text-sm text-vscode-accent hover:text-vscode-accent/80 mt-1.5 transition-colors'
                                >
                                  <ExternalLink size={14} />
                                  {(s.repository.url as string).replace('https://github.com/', '')}
                                </a>
                              )}
                            </div>
                            <button
                              onClick={() => handleRegistryInstall(entry)}
                              disabled={isDisabled}
                              title={isSseOnly ? t.mcp.sseNotSupported : undefined}
                              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                isDisabled
                                  ? 'bg-vscode-element text-vscode-text-muted cursor-default'
                                  : 'bg-vscode-accent hover:bg-vscode-accent/90 text-white'
                              }`}
                            >
                              {isInstalled
                                ? t.mcp.installed
                                : isSseOnly
                                ? t.mcp.sseOnly
                                : t.mcp.install}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!registryError && registryLoaded && registryServers.length === 0
                    && !registryLoading && (
                    <div className='text-center py-6 text-sm text-vscode-text-muted'>
                      {t.mcp.noResults}
                    </div>
                  )}

                  {registryLoading && (
                    <div className='flex items-center justify-center py-6 text-sm text-vscode-text-muted gap-2'>
                      <Loader2 size={16} className='animate-spin' />
                      {t.mcp.loading}
                    </div>
                  )}

                  {!registryError && !registryLoading && registryCursor && (
                    <div className='text-center'>
                      <button
                        onClick={() => loadRegistry(registrySearch, registryCursor)}
                        className='px-4 py-2 bg-vscode-element hover:bg-vscode-element/80 border border-vscode-border rounded-lg text-sm text-vscode-text transition-colors'
                      >
                        {t.mcp.loadMore}
                      </button>
                    </div>
                  )}
                </div>

                <div className='p-4 bg-vscode-element/50 rounded-lg border border-vscode-border/50 text-sm text-vscode-text-muted leading-relaxed'>
                  <p>{t.mcp.help}</p>
                </div>
              </div>
            );
          })()}

          {activeTab === 'skills' && (
            <div className='max-w-3xl mx-auto space-y-6'>
              <header>
                <h2 className='text-lg font-medium text-vscode-text-header mb-1'>
                  {t.skills.title}
                </h2>
                <p className='text-vscode-text-muted text-sm'>{t.skills.description}</p>
              </header>

              <div className='space-y-4'>
                <h3 className='text-sm font-medium text-vscode-text-header'>
                  {t.skills.installed} ({skills.length})
                </h3>

                {skills.length === 0
                  ? (
                    <div className='p-6 text-center text-vscode-text-muted bg-vscode-element/30 rounded-lg border border-vscode-border/50'>
                      {t.skills.noSkills}
                    </div>
                  )
                  : (
                    <div className='space-y-2'>
                      {skills.map(skill => (
                        <div
                          key={skill.location}
                          className='p-4 bg-vscode-element/50 rounded-lg border border-vscode-border/50'
                        >
                          <div className='flex items-start justify-between gap-4'>
                            <div className='min-w-0'>
                              <h4 className='text-sm font-medium text-vscode-text-header'>
                                {skill.name}
                              </h4>
                              <p className='text-sm text-vscode-text-muted mt-1'>
                                {skill.description}
                              </p>
                              <p
                                className='text-xs text-vscode-text-muted/60 mt-2 truncate'
                                title={skill.location}
                              >
                                {skill.location}
                              </p>
                            </div>
                            <button
                              onClick={async () => {
                                if (!confirm(t.skills.confirmRemove)) return;
                                try {
                                  await window.electronAPI.removeSkill(skill.location);
                                } catch {}
                                setSkills(await window.electronAPI.getSkills());
                              }}
                              className='shrink-0 p-1.5 text-vscode-text-muted hover:text-vscode-error transition-colors'
                              title={t.skills.remove}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>

              <div className='space-y-4'>
                <h3 className='text-sm font-medium text-vscode-text-header'>
                  {t.skills.installTitle}
                </h3>

                <div className='p-4 bg-vscode-element/50 rounded-lg border border-vscode-border/50 text-sm text-vscode-text-muted leading-relaxed space-y-4'>
                  <p>
                    <Fmt text={t.skills.installIntro} />
                  </p>

                  <div>
                    <p className='font-medium text-vscode-text-header mb-1'>
                      1. {t.skills.installStep1Title}
                    </p>
                    <p>
                      <Fmt text={t.skills.installStep1Text} />
                    </p>
                    <code className='block mt-1 px-3 py-1.5 bg-vscode-background rounded text-xs font-mono'>
                      {t.skills.installStep1Command}
                    </code>
                    <p className='mt-1'>
                      <Fmt text={t.skills.installStep1After} />
                    </p>
                  </div>

                  <div>
                    <p className='font-medium text-vscode-text-header mb-1'>
                      2. {t.skills.installStep2Title}
                    </p>
                    <p>
                      <Fmt text={t.skills.installStep2Text} />
                    </p>
                    <code className='block mt-1 px-3 py-1.5 bg-vscode-background rounded text-xs font-mono'>
                      {t.skills.installStep2Command}
                    </code>
                    <p className='mt-1'>
                      <Fmt text={t.skills.installStep2After} />
                    </p>
                  </div>

                  <div>
                    <p className='font-medium text-vscode-text-header mb-1'>
                      3. {t.skills.installStep3Title}
                    </p>
                    <p>
                      <Fmt text={t.skills.installStep3Text} />
                    </p>
                  </div>
                </div>
              </div>

              <div className='space-y-4'>
                <h3 className='text-sm font-medium text-vscode-text-header'>
                  {t.skills.discoverTitle}
                </h3>
                <div className='p-4 bg-vscode-element/50 rounded-lg border border-vscode-border/50 text-sm text-vscode-text-muted leading-relaxed space-y-2'>
                  <p>{t.skills.discoverText}</p>
                  <ul className='space-y-1'>
                    {t.skills.discoverLinks.map(link => (
                      <li key={link.url} className='flex items-center gap-2'>
                        <ExternalLink size={14} className='shrink-0' />
                        <a
                          href={link.url}
                          target='_blank'
                          rel='noreferrer'
                          className='text-vscode-accent hover:underline'
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className='p-4 bg-vscode-element/50 rounded-lg border border-vscode-border/50 text-sm text-vscode-text-muted leading-relaxed'>
                <p>
                  <Fmt text={t.skills.compatNote} />
                </p>
              </div>
            </div>
          )}

          {activeTab === 'mobile' && (
            <div className='max-w-3xl mx-auto space-y-6'>
              <header>
                <h2 className='text-lg font-medium text-vscode-text-header mb-1'>
                  {t.mobile.title}
                </h2>
                <p className='text-vscode-text-muted text-sm'>{t.mobile.description}</p>
              </header>

              <div className='bg-vscode-element border border-vscode-border rounded-lg p-4 space-y-4'>
                <div className='flex items-start gap-4'>
                  <div className='w-6 h-6 rounded-full bg-vscode-accent/10 text-vscode-accent flex items-center justify-center shrink-0 text-sm font-bold'>
                    1
                  </div>
                  <div>
                    <h3 className='text-sm font-medium text-vscode-text-header mb-1'>
                      {t.mobile.step1Title}
                    </h3>
                    <p className='text-xs text-vscode-text-muted'>
                      {t.mobile.step1TextBefore}
                      <button
                        onClick={() => setActiveTab('settings')}
                        className='text-vscode-accent hover:underline'
                      >
                        {t.mobile.step1SettingsLink}
                      </button>
                      <Fmt text={t.mobile.step1TextAfter} />
                    </p>
                  </div>
                </div>

                {[t.mobile.step2Title, t.mobile.step3Title, t.mobile.step4Title].map((title, i) => (
                  <div key={i} className='flex items-start gap-4'>
                    <div className='w-6 h-6 rounded-full bg-vscode-accent/10 text-vscode-accent flex items-center justify-center shrink-0 text-sm font-bold'>
                      {i + 2}
                    </div>
                    <div>
                      <h3 className='text-sm font-medium text-vscode-text-header mb-1'>{title}</h3>
                      <p className='text-xs text-vscode-text-muted'>
                        <Fmt
                          text={[t.mobile.step2Text, t.mobile.step3Text, t.mobile.step4Intro][i]}
                        />
                      </p>
                      {i === 2 && (
                        <>
                          <ul className='text-xs text-vscode-text-muted mt-2 space-y-1.5 list-disc list-inside'>
                            <li>
                              <Fmt text={t.mobile.step4Ios} />
                            </li>
                            <li>
                              <Fmt text={t.mobile.step4Android} />
                            </li>
                          </ul>
                          <p className='text-xs text-vscode-text-muted mt-2'>
                            {t.mobile.step4Outro}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className='p-4 bg-vscode-element/50 rounded-lg border border-vscode-border/50 text-xs text-vscode-text-muted leading-relaxed space-y-2'>
                <p>
                  <Fmt text={t.mobile.tip} />
                </p>
                <p>{t.mobile.networkNote}</p>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className='max-w-3xl mx-auto space-y-6'>
              <header>
                <h2 className='text-lg font-medium text-vscode-text-header mb-1'>
                  {t.settings.title}
                </h2>
                <p className='text-vscode-text-muted text-sm'>{t.settings.description}</p>
              </header>

              <div className='bg-vscode-element border border-vscode-border rounded-lg p-4 space-y-6'>
                <Select
                  label={t.permissions.approvalMode}
                  description={t.permissions.approvalDescription}
                  value={approvalMode}
                  onChange={handleApprovalModeChange}
                  options={[{value: 'none', label: t.permissions.noApproval}, {
                    value: 'write',
                    label: t.permissions.writeApproval,
                  }, {value: 'all', label: t.permissions.fullApproval}]}
                />

                <div className='border-t border-vscode-border' />

                <div>
                  <div className='flex items-center justify-between'>
                    <div>
                      <h3 className='text-sm font-medium text-vscode-text-header'>
                        {t.settings.lanAccess}
                      </h3>
                      <p className='text-xs text-vscode-text-muted mt-1'>
                        {t.settings.lanAccessDescription}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const next = !lanAccess;
                        setLanAccess(next);
                        const newConfig = {...desktopConfig, lanAccess: next};
                        setDesktopConfig(newConfig);
                        await window.electronAPI.saveDesktopConfig(newConfig);
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        lanAccess ? 'bg-vscode-accent' : 'bg-vscode-border'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          lanAccess ? 'translate-x-5.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className='border-t border-vscode-border' />

                <div>
                  <div className='flex items-center justify-between'>
                    <div>
                      <h3 className='text-sm font-medium text-vscode-text-header'>
                        {t.settings.fixedPort}
                      </h3>
                      <p className='text-xs text-vscode-text-muted mt-1'>
                        {t.settings.fixedPortDescription}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const next = fixedPort ? null : 5281;
                        setFixedPort(next);
                        const newConfig = {...desktopConfig, fixedPort: next};
                        setDesktopConfig(newConfig);
                        await window.electronAPI.saveDesktopConfig(newConfig);
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        fixedPort ? 'bg-vscode-accent' : 'bg-vscode-border'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          fixedPort ? 'translate-x-5.5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  {fixedPort !== null && (
                    <div className='mt-3'>
                      <input
                        type='number'
                        value={fixedPort}
                        onChange={async e => {
                          const val = parseInt(e.target.value, 10);
                          const port = isNaN(val) ? null : Math.max(1, Math.min(65535, val));
                          setFixedPort(port);
                          const newConfig = {...desktopConfig, fixedPort: port};
                          setDesktopConfig(newConfig);
                          await window.electronAPI.saveDesktopConfig(newConfig);
                        }}
                        min={1}
                        max={65535}
                        className='w-32 px-3 py-2 bg-vscode-bg border border-vscode-border rounded-lg text-sm text-vscode-text focus:outline-none focus:border-vscode-accent select-text'
                      />
                    </div>
                  )}
                </div>

                <div className='border-t border-vscode-border' />

                <div>
                  <h3 className='text-sm font-medium text-vscode-text-header'>
                    {t.settings.language}
                  </h3>
                  <p className='text-xs text-vscode-text-muted mt-1 mb-3'>
                    {t.settings.languageDescription}
                  </p>
                  <Select
                    label=''
                    value={language}
                    onChange={async v => {
                      setLanguage(v);
                      const newConfig = {...desktopConfig, language: v};
                      setDesktopConfig(newConfig);
                      await window.electronAPI.saveDesktopConfig(newConfig);
                    }}
                    options={SUPPORTED_LANGUAGES}
                  />
                </div>
              </div>

              <div className='p-4 bg-vscode-element/50 rounded-lg border border-vscode-border/50 text-xs text-vscode-text-muted leading-relaxed space-y-2'>
                <p>
                  <strong className='text-vscode-text-header'>{t.sidebar.writeApproval}</strong>
                  {' '}
                  {t.permissions.writeRecommended}
                </p>
                <p>
                  <strong className='text-vscode-text-header'>{t.sidebar.fullApproval}</strong>{' '}
                  {t.permissions.fullDescription}
                </p>
                <p>
                  <strong className='text-vscode-text-header'>{t.settings.lanAccess}</strong>{' '}
                  {t.settings.lanAccessHelp}
                </p>
                <p>
                  <strong className='text-vscode-text-header'>{t.settings.fixedPort}</strong>{' '}
                  {t.settings.fixedPortHelp}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'prompts' && (
            <div className='max-w-3xl mx-auto space-y-6'>
              <header>
                <h2 className='text-lg font-medium text-vscode-text-header mb-1'>
                  {t.prompts.title}
                </h2>
                <p className='text-vscode-text-muted text-sm'>{t.prompts.description}</p>
              </header>

              <div className='bg-vscode-element border border-vscode-border rounded-lg p-4'>
                <Select
                  label={t.prompts.workflowMode}
                  description={t.prompts.workflowDescription}
                  value={selectedPromptType}
                  onChange={v => handlePromptTypeChange(v as PromptType)}
                  options={[
                    {value: 'specialist', label: t.prompts.specialist},
                    {value: 'artist', label: t.prompts.artist},
                    {value: 'explorer', label: t.prompts.explorer},
                    {value: 'assistant', label: t.prompts.assistant},
                  ]}
                />

                <div className='mt-4'>
                  <div className='flex items-center justify-between mb-2'>
                    <label className='text-sm font-medium text-vscode-text-header'>
                      {t.prompts.systemPrompt}
                    </label>
                    {customPrompts[selectedPromptType] !== null && (
                      <span className='text-xs text-vscode-accent'>{t.prompts.customized}</span>
                    )}
                  </div>
                  <textarea
                    value={promptEditorValue}
                    onChange={e => setPromptEditorValue(e.target.value)}
                    placeholder={t.prompts.placeholder(t.prompts[selectedPromptType])}
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
                    {isSavingPrompt ? t.prompts.saving : t.prompts.savePrompt}
                  </button>
                  <button
                    onClick={handleResetPrompt}
                    disabled={customPrompts[selectedPromptType] === null}
                    className='px-4 py-2 bg-vscode-bg hover:bg-vscode-element border border-vscode-border rounded-lg text-sm font-medium text-vscode-text-muted hover:text-vscode-text disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2'
                  >
                    <RotateCcw size={16} />
                    {t.prompts.resetToDefault}
                  </button>
                </div>

                <div className='mt-4 p-4 bg-vscode-bg/50 rounded-lg border border-vscode-border/50 text-xs text-vscode-text-muted leading-relaxed'>
                  <p className='mb-2'>
                    <strong className='text-vscode-text-header'>{t.prompts.specialist}</strong>{' '}
                    {t.prompts.specialistHelp}
                  </p>
                  <p className='mb-2'>
                    <strong className='text-vscode-text-header'>{t.prompts.artist}</strong>{' '}
                    {t.prompts.artistHelp}
                  </p>
                  <p className='mb-2'>
                    <strong className='text-vscode-text-header'>{t.prompts.explorer}</strong>{' '}
                    {t.prompts.explorerHelp}
                  </p>
                  <p>
                    <strong className='text-vscode-text-header'>{t.prompts.assistant}</strong>{' '}
                    {t.prompts.assistantHelp}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'office' && (
            <div className='max-w-3xl mx-auto space-y-6'>
              <header>
                <h2 className='text-lg font-medium text-vscode-text-header mb-1'>
                  {t.office.title}
                </h2>
                <p className='text-vscode-text-muted text-sm'>{t.office.description}</p>
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
                        ? t.office.running
                        : officeInstalled
                        ? t.office.installed
                        : t.office.notInstalled}
                    </span>
                  </div>
                  {officeInstalled && officeRunning && (
                    <span className='text-xs text-vscode-text-muted'>
                      {t.office.httpsPort} {officePort}
                    </span>
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
                        {isOfficeLoading ? t.office.installing : t.office.installAddin}
                      </button>
                    )
                    : (
                      <button
                        onClick={handleUninstallOffice}
                        disabled={isOfficeLoading}
                        className='flex-1 py-2 bg-vscode-bg hover:bg-vscode-element border border-vscode-border rounded-lg text-sm font-medium text-vscode-text-muted hover:text-vscode-text disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2'
                      >
                        {isOfficeLoading && <Loader2 size={16} className='animate-spin' />}
                        {isOfficeLoading ? t.office.removing : t.office.uninstall}
                      </button>
                    )}
                </div>
              </div>

              <div className='p-4 bg-vscode-element/50 rounded-lg border border-vscode-border/50 text-xs text-vscode-text-muted leading-relaxed space-y-2'>
                <p>
                  <Fmt text={t.office.howItWorks} />
                </p>
                <p>
                  <Fmt text={t.office.afterInstalling} />
                </p>
                <p>{t.office.desktopRequired}</p>
              </div>
            </div>
          )}

          {activeTab === 'figma' && (
            <div className='max-w-3xl mx-auto space-y-6'>
              <header>
                <h2 className='text-lg font-medium text-vscode-text-header mb-1'>
                  {t.figma.title}
                </h2>
                <p className='text-vscode-text-muted text-sm'>{t.figma.description}</p>
              </header>

              <div className='bg-vscode-element border border-vscode-border rounded-lg p-4 space-y-4'>
                {[t.figma.step1Title, t.figma.step2Title, t.figma.step3Title, t.figma.step4Title]
                  .map((title, i) => (
                    <div key={i} className='flex items-start gap-4'>
                      <div className='w-6 h-6 rounded-full bg-vscode-accent/10 text-vscode-accent flex items-center justify-center shrink-0 text-sm font-bold'>
                        {i + 1}
                      </div>
                      <div>
                        <h3 className='text-sm font-medium text-vscode-text-header mb-1'>
                          {title}
                        </h3>
                        <p className={`text-xs text-vscode-text-muted${i === 0 ? ' mb-2' : ''}`}>
                          <Fmt
                            text={[
                              t.figma.step1Text,
                              t.figma.step2Text,
                              t.figma.step3Text,
                              t.figma.step4Text,
                            ][i]}
                          />
                        </p>
                        {i === 0 && (
                          <a
                            href='https://github.com/bluenoah1991/omni-context-cli-landing/releases'
                            target='_blank'
                            className='inline-flex items-center gap-2 px-4 py-2 bg-vscode-accent hover:bg-vscode-accent/90 text-white rounded-lg text-sm font-medium transition-colors'
                          >
                            {t.figma.openReleases}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              <div className='bg-vscode-element border border-vscode-border rounded-lg p-4'>
                <h3 className='text-sm font-medium text-vscode-text-header mb-2'>{t.figma.note}</h3>
                <p className='text-xs text-vscode-text-muted'>
                  <Fmt text={t.figma.noteText} />
                </p>
              </div>
            </div>
          )}

          {activeTab === 'browser' && (
            <div className='max-w-3xl mx-auto space-y-6'>
              <header>
                <h2 className='text-lg font-medium text-vscode-text-header mb-1'>
                  {t.browserTab.title}
                </h2>
                <p className='text-vscode-text-muted text-sm'>{t.browserTab.description}</p>
              </header>

              <div className='bg-vscode-element border border-vscode-border rounded-lg p-4 space-y-4'>
                {[
                  t.browserTab.step1Title,
                  t.browserTab.step2Title,
                  t.browserTab.step3Title,
                  t.browserTab.step4Title,
                ].map((title, i) => (
                  <div key={i} className='flex items-start gap-4'>
                    <div className='w-6 h-6 rounded-full bg-vscode-accent/10 text-vscode-accent flex items-center justify-center shrink-0 text-sm font-bold'>
                      {i + 1}
                    </div>
                    <div>
                      <h3 className='text-sm font-medium text-vscode-text-header mb-1'>{title}</h3>
                      <p className={`text-xs text-vscode-text-muted${i === 0 ? ' mb-2' : ''}`}>
                        <Fmt
                          text={[
                            t.browserTab.step1Text,
                            t.browserTab.step2Text,
                            t.browserTab.step3Text,
                            t.browserTab.step4Text,
                          ][i]}
                        />
                      </p>
                      {i === 0 && (
                        <a
                          href='https://github.com/bluenoah1991/omni-context-cli-landing/releases'
                          target='_blank'
                          className='inline-flex items-center gap-2 px-4 py-2 bg-vscode-accent hover:bg-vscode-accent/90 text-white rounded-lg text-sm font-medium transition-colors'
                        >
                          {t.browserTab.openReleases}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'obsidian' && (
            <div className='max-w-3xl mx-auto space-y-6'>
              <header>
                <h2 className='text-lg font-medium text-vscode-text-header mb-1'>
                  {t.obsidian.title}
                </h2>
                <p className='text-vscode-text-muted text-sm'>{t.obsidian.description}</p>
              </header>

              <div className='bg-vscode-element border border-vscode-border rounded-lg p-4 space-y-4'>
                {[
                  t.obsidian.step1Title,
                  t.obsidian.step2Title,
                  t.obsidian.step3Title,
                  t.obsidian.step4Title,
                ].map((title, i) => (
                  <div key={i} className='flex items-start gap-4'>
                    <div className='w-6 h-6 rounded-full bg-vscode-accent/10 text-vscode-accent flex items-center justify-center shrink-0 text-sm font-bold'>
                      {i + 1}
                    </div>
                    <div>
                      <h3 className='text-sm font-medium text-vscode-text-header mb-1'>{title}</h3>
                      <p className={`text-xs text-vscode-text-muted${i === 0 ? ' mb-2' : ''}`}>
                        <Fmt
                          text={[
                            t.obsidian.step1Text,
                            t.obsidian.step2Text,
                            t.obsidian.step3Text,
                            t.obsidian.step4Text,
                          ][i]}
                        />
                      </p>
                      {i === 0 && (
                        <a
                          href='https://github.com/bluenoah1991/omni-context-cli-landing/releases'
                          target='_blank'
                          className='inline-flex items-center gap-2 px-4 py-2 bg-vscode-accent hover:bg-vscode-accent/90 text-white rounded-lg text-sm font-medium transition-colors'
                        >
                          {t.obsidian.openReleases}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className='bg-vscode-element border border-vscode-border rounded-lg p-4'>
                <h3 className='text-sm font-medium text-vscode-text-header mb-2'>
                  {t.obsidian.note}
                </h3>
                <p className='text-xs text-vscode-text-muted'>
                  <Fmt text={t.obsidian.noteText} />
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
