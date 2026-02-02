import { Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DiffPanel } from './components/DiffPanel';
import { IconButton } from './components/IconButton';
import InputBox from './components/InputBox';
import MessageList from './components/MessageList';
import SessionSelector from './components/SessionSelector';
import Settings from './components/Settings';
import { useChatStore } from './store/chatStore';

const isEmbed = document.querySelector('meta[name="embed"]')?.getAttribute('content') === 'true';

export default function App() {
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
  } = useChatStore();

  useEffect(() => {
    const isLight = config?.webTheme === 'light'
      || (config?.webTheme === 'auto'
        && window.matchMedia('(prefers-color-scheme: light)').matches);
    document.documentElement.classList.toggle('light', isLight);
    setTheme(isLight ? 'light' : 'dark');
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
      <div className='flex-1 flex flex-col min-w-0'>
        <header className='safe-area-top flex-none pb-2 bg-vscode-bg z-10 px-4 border-b border-vscode-element'>
          <div className='flex items-center justify-between w-full'>
            <div className='w-80'>
              <SessionSelector disabled={isLoading} />
            </div>
            <div className='flex items-center gap-4'>
              {!isEmbed && (
                <span className='hidden sm:block text-vscode-text font-medium uppercase'>
                  {config?.projectName}
                </span>
              )}
              <IconButton
                icon={SettingsIcon}
                title='Settings'
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

      <DiffPanel />

      {isSettingsOpen && <Settings onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
}
