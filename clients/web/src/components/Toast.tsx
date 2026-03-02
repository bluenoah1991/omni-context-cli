import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { useEffect } from 'react';
import { create } from 'zustand';

interface ToastItem {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface ToastState {
  toasts: ToastItem[];
  dismiss: (id: number) => void;
}

let nextId = 0;

const useToastStore = create<ToastState>(set => ({
  toasts: [],
  dismiss: id => set(s => ({toasts: s.toasts.filter(t => t.id !== id)})),
}));

export function showToast(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const id = nextId++;
  useToastStore.setState(s => ({toasts: [...s.toasts, {id, message, type}]}));
  setTimeout(() => useToastStore.getState().dismiss(id), 3500);
}

const icons = {info: Info, success: CheckCircle, error: AlertCircle};

const colors = {
  info: 'bg-vscode-element border-vscode-border text-vscode-text',
  success: 'bg-green-900/80 border-green-700/50 text-green-100',
  error: 'bg-vscode-error/10 border-vscode-error/50 text-vscode-text',
};

function ToastItem({toast, onDismiss}: {toast: ToastItem; onDismiss: () => void;}) {
  const Icon = icons[toast.type];

  useEffect(() => {
    const el = document.getElementById(`toast-${toast.id}`);
    if (el) {
      requestAnimationFrame(() => el.classList.remove('opacity-0', 'translate-y-2'));
    }
  }, [toast.id]);

  return (
    <div
      id={`toast-${toast.id}`}
      className={`flex items-center gap-3 pl-4 pr-2 py-2.5 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-200 opacity-0 translate-y-2 ${
        colors[toast.type]
      }`}
    >
      <Icon size={16} className='shrink-0 opacity-80' />
      <span className='text-sm flex-1'>{toast.message}</span>
      <button
        onClick={onDismiss}
        className='p-1 rounded hover:bg-white/10 opacity-60 hover:opacity-100 transition-opacity'
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const {toasts, dismiss} = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col gap-2 max-w-sm w-full px-4'>
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => dismiss(toast.id)}
        />
      ))}
    </div>
  );
}
