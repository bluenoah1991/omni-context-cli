import { Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { IconButton } from './components/IconButton';
import InputBox from './components/InputBox';
import MessageList from './components/MessageList';
import SessionSelector from './components/SessionSelector';
import Settings from './components/Settings';
import { useChatStore } from './store/chatStore';

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
  } = useChatStore();

  useEffect(() => {
    const isLight = config?.webTheme === 'light'
      || (config?.webTheme === 'auto'
        && window.matchMedia('(prefers-color-scheme: light)').matches);
    document.documentElement.classList.toggle('light', isLight);
  }, [config?.webTheme]);

  useEffect(() => {
    Promise.all([getModels(), getModel(), getSession(), getConfig()]);
    startPolling();
    return () => stopPolling();
  }, []);

  useEffect(() => {
    if (currentModel) {
      getSessions();
    }
  }, [currentModel?.provider, getSessions]);

  return (
    <div className='flex flex-col h-screen bg-vscode-bg text-vscode-text text-sm overflow-hidden'>
      <header className='flex-none py-4 bg-vscode-bg z-10 px-4 border-b border-vscode-element'>
        <div className='flex items-center justify-between w-full'>
          <div className='flex items-center gap-4'>
            <span className='hidden sm:block text-vscode-text font-medium'>
              {config?.projectName}
            </span>
            <div className='w-80'>
              <SessionSelector disabled={isLoading} />
            </div>
          </div>
          <IconButton
            icon={SettingsIcon}
            title='Settings'
            onClick={() => setIsSettingsOpen(true)}
            disabled={isLoading}
          />
        </div>
      </header>

      <main className='flex-1 flex flex-col min-h-0 relative'>
        <MessageList />
      </main>

      <div className='flex-none bg-vscode-bg px-4'>
        <InputBox disabled={!currentModel} />
      </div>

      {isSettingsOpen && <Settings onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
}
