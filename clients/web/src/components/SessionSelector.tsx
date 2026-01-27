import { ChevronDown, MessageSquare, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/chatStore';

interface SessionSelectorProps {
  disabled?: boolean;
}

export default function SessionSelector({disabled = false}: SessionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {sessions, currentSession, loadSession, newSession} = useChatStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className='flex items-center gap-2 w-full' ref={dropdownRef}>
      <div className='relative flex-1 min-w-0'>
        <button
          type='button'
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`group w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 border border-vscode-border bg-vscode-sidebar ${
            disabled
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-vscode-element text-vscode-text hover:border-vscode-border-active'
          }`}
        >
          <MessageSquare size={16} className='text-vscode-accent shrink-0' />
          <span className='truncate text-sm font-medium text-vscode-text group-hover:text-vscode-text-header transition-colors'>
            {currentSession ? currentSession.title : 'New chat'}
          </span>
          <ChevronDown
            size={14}
            className={`text-vscode-text-muted transition-transform duration-200 shrink-0 ml-auto ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isOpen && (
          <div className='absolute top-full left-0 z-50 w-full mt-2 bg-vscode-sidebar border border-vscode-border rounded-lg shadow-xl overflow-hidden animate-fade-in backdrop-blur-sm'>
            {sessions.length === 0
              ? (
                <div className='px-4 py-3 text-sm text-vscode-text-muted text-center'>
                  No previous sessions
                </div>
              )
              : (
                <ul className='max-h-80 overflow-y-auto custom-scrollbar py-1'>
                  {sessions.map(session => (
                    <li key={session.id}>
                      <button
                        type='button'
                        onClick={() => {
                          loadSession(session);
                          setIsOpen(false);
                        }}
                        className='w-full text-left px-4 py-2.5 text-sm transition-colors border-l-2 text-vscode-text border-transparent hover:bg-vscode-element hover:text-vscode-text-header'
                      >
                        <div className='truncate'>{session.title}</div>
                        <div className='text-[10px] text-vscode-text-muted mt-0.5 font-mono'>
                          {new Date(session.updatedAt).toLocaleDateString()}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        )}
      </div>

      <button
        onClick={() => newSession()}
        disabled={disabled}
        className={`p-2.5 bg-vscode-element hover:brightness-110 text-vscode-text-header rounded-lg transition-all shrink-0 border border-vscode-border hover:border-vscode-border-active ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        title='New chat'
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
