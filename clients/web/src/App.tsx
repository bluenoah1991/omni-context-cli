import { FolderTree, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FileTree } from './components/FileTree';
import { IconButton } from './components/IconButton';
import InputBox from './components/InputBox';
import MessageList from './components/MessageList';
import { PreviewPanel } from './components/PreviewPanel';
import SessionSelector from './components/SessionSelector';
import Settings from './components/Settings';
import { useLocale } from './i18n';
import { useChatStore } from './store/chatStore';

const isEmbed = document.querySelector('meta[name="embed"]')?.getAttribute('content') === 'true';

export default function App() {
  const t = useLocale();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const {
    config,
    getConfig,
    getModel,
    getModels,
    getSession,
    getSessions,
    startPolling,
    stopPolling,
    isLoading,
    currentModel,
    setTheme,
    toggleFileTree,
  } = useChatStore();

  useEffect(() => {
    const webTheme = config?.webTheme;
    const applyTheme = (isLight: boolean) => {
      document.documentElement.classList.toggle('light', isLight);
      setTheme(isLight ? 'light' : 'dark');
    };
    const isLight = webTheme === 'light'
      || (webTheme === 'auto' && window.matchMedia('(prefers-color-scheme: light)').matches);
    applyTheme(isLight);

    if (webTheme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
      const updateMediaTheme = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', updateMediaTheme);

      const handleMessage = (e: MessageEvent) => {
        if (e.data?.type === 'themeChange') {
          applyTheme(e.data.theme === 'light');
        }
      };
      window.addEventListener('message', handleMessage);

      return () => {
        mediaQuery.removeEventListener('change', updateMediaTheme);
        window.removeEventListener('message', handleMessage);
      };
    }
  }, [config?.webTheme, setTheme]);

  useEffect(() => {
    Promise.all([getModels(), getModel(), getSession(), getConfig()]);
    startPolling();
    return () => stopPolling();
  }, []);

  useEffect(() => {
    if (currentModel) {
      getSessions();
    }
  }, [currentModel?.provider]);

  useEffect(() => {
    document.title = config?.projectName || 'OmniContext CLI';
  }, [config?.projectName]);

  return (
    <div className='flex h-screen bg-vscode-bg text-vscode-text text-sm overflow-hidden'>
      {!isEmbed && <FileTree />}

      <div className='flex-1 flex flex-col min-w-0'>
        <header className='safe-area-top flex-none pb-2 bg-vscode-bg z-10 px-4 border-b border-vscode-element'>
          <div className='flex items-center justify-between w-full'>
            <div className='flex items-center gap-2 min-w-0 max-w-[60%] sm:w-80'>
              {!isEmbed && (
                <IconButton
                  icon={FolderTree}
                  title={t.app.toggleFileTree}
                  onClick={toggleFileTree}
                  className='hidden sm:flex'
                />
              )}
              <SessionSelector disabled={isLoading} />
            </div>
            <div className='flex items-center gap-4'>
              <IconButton
                icon={SettingsIcon}
                title={t.app.settings}
                onClick={() => setIsSettingsOpen(true)}
                disabled={isLoading}
              />
            </div>
          </div>
        </header>

        <main className='flex-1 flex flex-col min-h-0 relative'>
          <MessageList />
        </main>

        <div className='safe-area-bottom flex-none bg-vscode-bg px-4 border-t border-vscode-element'>
          <InputBox disabled={!currentModel} />
        </div>
      </div>

      <PreviewPanel />

      {isSettingsOpen && <Settings onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
}
