import {
  ArrowDown,
  ArrowUp,
  Brain,
  FileCode,
  MessageSquare,
  RefreshCw,
  Scissors,
  Send,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import type { RewindPoint } from '../types/rewind';
import { formatApprovalPrompt } from '../utils/toolApproval';
import { OptionPicker } from './OptionPicker';
import RewindPicker from './RewindPicker';
import SlashCommandPicker from './SlashCommandPicker';
import { StatusIcon } from './StatusIcon';

interface Attachment {
  id: string;
  fileName: string;
  dataUrl: string;
  base64: string;
  mediaType: string;
}

interface InputBoxProps {
  disabled?: boolean;
}

function processFile(file: File): Promise<Attachment> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result as string;
      const [header, base64] = result.split(',');
      const mediaType = header.split(':')[1].split(';')[0];

      resolve({
        id: Date.now().toString() + Math.random().toString(36).substring(2),
        fileName: file.name,
        dataUrl: result,
        base64,
        mediaType,
      });
    };
    reader.readAsDataURL(file);
  });
}

function isImageType(mediaType: string): boolean {
  return mediaType.startsWith('image/');
}

function isDocumentType(mediaType: string): boolean {
  return mediaType === 'application/pdf';
}

function isSupportedType(mediaType: string): boolean {
  return isImageType(mediaType) || isDocumentType(mediaType);
}

function formatFileLabel(file: {path: string; lineStart?: number; lineEnd?: number;}): string {
  const fileName = file.path.split(/[/\\]/).pop() || file.path;
  if (file.lineStart) {
    return file.lineEnd && file.lineEnd !== file.lineStart
      ? `${fileName}:${file.lineStart}-${file.lineEnd}`
      : `${fileName}:${file.lineStart}`;
  }
  return fileName;
}

export default function InputBox({disabled = false}: InputBoxProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pickerCancelled, setPickerCancelled] = useState(false);
  const [rewindPoints, setRewindPoints] = useState<RewindPoint[] | null>(null);
  const [rewindIndex, setRewindIndex] = useState(0);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedInput, setSavedInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    isLoading,
    sendMessage,
    stopGeneration,
    config,
    currentModel,
    models,
    currentSession,
    ideContext,
    inputHistory,
    slashCommands,
    pendingApproval,
    getInputHistory,
    getSlashCommands,
    getRewindPoints,
    rewind,
    handleToolApproval,
  } = useChatStore();

  useEffect(() => {
    getInputHistory();
    getSlashCommands();
  }, [getInputHistory, getSlashCommands]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    const height = Math.max(24, Math.min(textareaRef.current.scrollHeight, 200));
    textareaRef.current.style.height = `${height}px`;
  }, [message]);

  useEffect(() => {
    if (!isLoading && !disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading, disabled]);

  const filteredCommands = useMemo(() => {
    if (!message || !message.startsWith('/') || message.includes('\n')) return [];
    const query = message.slice(1).toLowerCase();
    if (!query) return slashCommands;
    return slashCommands.filter(command => command.name.toLowerCase().startsWith(query));
  }, [message, slashCommands]);

  const hasExactMatch = useMemo(() => {
    if (!message || !message.startsWith('/')) return false;
    const query = message.slice(1).toLowerCase();
    return slashCommands.some(command => command.name.toLowerCase() === query);
  }, [message, slashCommands]);

  const showPicker = !pickerCancelled && !hasExactMatch && filteredCommands.length > 0;

  useEffect(() => {
    setPickerCancelled(false);
    setSelectedIndex(0);
    setRewindPoints(null);
    setRewindIndex(0);
  }, [message]);

  const handleSelectCommand = useCallback((commandName: string) => {
    setMessage(`/${commandName} `);
    textareaRef.current?.focus();
  }, []);

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const newAttachments: Attachment[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (isSupportedType(item.type)) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const attachment = await processFile(file);
          newAttachments.push(attachment);
        }
      }
    }

    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const newAttachments: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (isSupportedType(file.type)) {
        const attachment = await processFile(file);
        newAttachments.push(attachment);
      }
    }

    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const showRewindPicker = rewindPoints !== null;

  const handleRewind = useCallback(async (index: number) => {
    await rewind(index);
    setMessage('');
    setRewindPoints(null);
  }, [rewind]);

  const handleSend = async () => {
    if (message.trim() && !isLoading && !disabled) {
      const text = message.trim();

      if (text === '/rewind') {
        const points = await getRewindPoints();
        setRewindPoints(points);
        setRewindIndex(0);
        return;
      }

      const attachmentData = attachments.map(a => ({
        base64: a.base64,
        mediaType: a.mediaType,
        fileName: a.fileName,
      }));
      sendMessage(text, attachmentData.length > 0 ? attachmentData : undefined);
      setMessage('');
      setAttachments([]);
      setHistoryIndex(-1);
      setSavedInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (rewindPoints !== null) {
      if (rewindPoints.length > 0) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setRewindIndex(index => (index <= 0 ? rewindPoints.length - 1 : index - 1));
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setRewindIndex(index => (index >= rewindPoints.length - 1 ? 0 : index + 1));
          return;
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (rewindPoints[rewindIndex]) {
            handleRewind(rewindPoints[rewindIndex].index);
          }
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setRewindPoints(null);
        return;
      }
      return;
    }

    if (showPicker) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(index => (index <= 0 ? filteredCommands.length - 1 : index - 1));
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(index => (index >= filteredCommands.length - 1 ? 0 : index + 1));
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          handleSelectCommand(filteredCommands[selectedIndex].name);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setPickerCancelled(true);
        return;
      }
    }

    if (e.key === 'ArrowUp' && inputHistory.length > 0) {
      const textarea = textareaRef.current;
      const isFirstLine = !textarea || textarea.selectionStart === 0
        || !message.substring(0, textarea.selectionStart).includes('\n');
      if (isFirstLine) {
        e.preventDefault();
        const newIndex = Math.min(historyIndex + 1, inputHistory.length - 1);
        if (newIndex !== historyIndex) {
          if (historyIndex === -1) setSavedInput(message);
          setHistoryIndex(newIndex);
          setMessage(inputHistory[inputHistory.length - 1 - newIndex]);
        }
        return;
      }
    }

    if (e.key === 'ArrowDown' && historyIndex >= 0) {
      const textarea = textareaRef.current;
      const isLastLine = !textarea || textarea.selectionStart === message.length
        || !message.substring(textarea.selectionStart).includes('\n');
      if (isLastLine) {
        e.preventDefault();
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setMessage(newIndex === -1 ? savedInput : inputHistory[inputHistory.length - 1 - newIndex]);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      handleSend();
    }
  };

  const agentModel = config?.agentModelId ? models.find(m => m.id === config.agentModelId) : null;
  const currentModelName = currentModel?.nickname || currentModel?.name || 'Not Set';
  const showAgentModel = agentModel && agentModel.id !== currentModel?.id;
  const agentModelName = agentModel?.nickname || agentModel?.name;
  const contextLimit = (currentModel?.contextSize || 200) * 1024;
  const totalTokens = (currentSession?.inputTokens || 0) + (currentSession?.outputTokens || 0);
  const contextPercent = contextLimit > 0 ? ((totalTokens / contextLimit) * 100).toFixed(1) : '0';

  const hasContext = ideContext || attachments.length > 0;

  return (
    <div className='bg-vscode-bg pb-6 pt-4'>
      <div className='max-w-4xl mx-auto space-y-3'>
        {hasContext && (
          <div className='flex flex-wrap gap-2 animate-fade-in'>
            {ideContext && (
              <div className='flex items-center gap-1.5 px-2.5 py-1.5 bg-vscode-element border border-vscode-accent rounded-md text-xs text-vscode-text'>
                <FileCode size={12} className='text-vscode-accent' />
                <span className='max-w-50 truncate' title={ideContext.path}>
                  {formatFileLabel(ideContext)}
                </span>
              </div>
            )}
            {attachments.map(attachment => (
              <div
                key={attachment.id}
                className='relative group rounded-md overflow-hidden border border-vscode-border'
              >
                {isImageType(attachment.mediaType)
                  ? (
                    <img
                      src={attachment.dataUrl}
                      alt='Attached'
                      className='w-10 h-10 object-cover'
                    />
                  )
                  : (
                    <div className='w-10 h-10 flex items-center justify-center bg-vscode-element text-vscode-text text-xs'>
                      PDF
                    </div>
                  )}
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className='absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'
                >
                  <X size={14} className='text-white' />
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          className={`relative bg-vscode-sidebar border transition-colors rounded-xl ${
            isDragging
              ? 'border-vscode-accent border-dashed bg-vscode-accent/5'
              : isLoading
              ? 'border-vscode-border'
              : 'border-vscode-border focus-within:border-vscode-accent focus-within:ring-1 focus-within:ring-vscode-accent/30'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className='absolute inset-0 flex items-center justify-center bg-vscode-sidebar/90 rounded-xl z-20 pointer-events-none'>
              <span className='text-sm text-vscode-accent'>Drop images or PDFs here</span>
            </div>
          )}
          {showRewindPicker && (
            <RewindPicker
              points={rewindPoints ?? []}
              selectedIndex={rewindIndex}
              onSelect={handleRewind}
            />
          )}
          {pendingApproval && (
            <OptionPicker
              title={formatApprovalPrompt(pendingApproval)}
              options={[{key: 'approve', label: 'Approve and continue'}, {
                key: 'reject',
                label: 'Deny and abort',
              }]}
              onSelect={key => handleToolApproval(key === 'approve')}
              onCancel={() => handleToolApproval(false)}
            />
          )}
          {showPicker && !showRewindPicker && !pendingApproval && (
            <SlashCommandPicker
              commands={filteredCommands}
              selectedIndex={selectedIndex}
              onSelect={handleSelectCommand}
            />
          )}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder={disabled
              ? 'Configure a model in settings'
              : isLoading
              ? 'Waiting for response...'
              : 'Type your message...'}
            disabled={isLoading || disabled}
            rows={1}
            className='w-full px-4 py-3 bg-transparent text-sm text-vscode-text placeholder-vscode-text-muted resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed'
          />

          <div className='flex items-center justify-between px-3 pb-2 pt-1'>
            <div className='flex items-center gap-3 text-xs text-vscode-text-muted select-none overflow-hidden'>
              <div
                className='flex items-center gap-1.5 px-1.5 py-0.5 rounded-md hover:bg-white/5 light:hover:bg-black/5 transition-colors cursor-default min-w-0 max-w-48 truncate'
                title={showAgentModel
                  ? `${currentModelName} / ${agentModelName}`
                  : currentModelName}
              >
                <span className='text-vscode-text font-medium truncate'>{currentModelName}</span>
                {showAgentModel && (
                  <>
                    <span className='text-vscode-text-muted shrink-0'>/</span>
                    <span className='text-vscode-text-muted truncate'>{agentModelName}</span>
                  </>
                )}
              </div>

              <div className='w-px h-3 bg-vscode-border shrink-0' />

              <div className='flex items-center gap-0.5 shrink-0'>
                <StatusIcon
                  icon={Sparkles}
                  active={config?.specialistMode}
                  title='Specialist Mode'
                />
                <StatusIcon
                  icon={Brain}
                  active={config?.enableThinking}
                  title='Extended Thinking'
                />
                <StatusIcon icon={MessageSquare} active={config?.memoryEnabled} title='Memory' />
                <StatusIcon
                  icon={Scissors}
                  active={config?.contextEditing}
                  title='Context Editing'
                />
              </div>

              <div className='w-px h-3 bg-vscode-border shrink-0' />

              <div className='flex items-center gap-2 shrink-0' title='Token Usage'>
                <span className={Number(contextPercent) > 80 ? 'text-vscode-warning' : ''}>
                  {contextPercent}%
                </span>
                <span className='flex items-center gap-1.5'>
                  <span className='flex items-center gap-0.5'>
                    <ArrowUp size={12} />
                    {currentSession?.inputTokens || 0}
                  </span>
                  <span className='flex items-center gap-0.5'>
                    <ArrowDown size={12} />
                    {currentSession?.outputTokens || 0}
                  </span>
                  <span className='flex items-center gap-0.5'>
                    <RefreshCw size={12} />
                    {currentSession?.cachedTokens || 0}
                  </span>
                </span>
              </div>
            </div>

            <div className='flex items-center pl-2'>
              {isLoading
                ? (
                  <button
                    type='button'
                    onClick={stopGeneration}
                    className='p-1.5 bg-vscode-error hover:brightness-90 text-white rounded-md transition-all shadow-sm'
                    title='Stop generation'
                  >
                    <Square size={14} fill='currentColor' />
                  </button>
                )
                : (
                  <button
                    type='button'
                    onClick={handleSend}
                    disabled={!message.trim() || disabled}
                    className={`p-1.5 rounded-md transition-all ${
                      !message.trim() || disabled
                        ? 'text-vscode-border-active cursor-not-allowed'
                        : 'bg-vscode-accent text-white hover:brightness-110 shadow-sm'
                    }`}
                    title='Send message'
                  >
                    <Send size={14} />
                  </button>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
