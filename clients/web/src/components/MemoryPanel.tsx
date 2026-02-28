import { Minus, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocale } from '../i18n';
import { fetchMemory, KeyPoint, saveMemory } from '../services/memoryService';

interface MemoryPanelProps {
  onClose: () => void;
}

export default function MemoryPanel({onClose}: MemoryPanelProps) {
  const t = useLocale();
  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMemory().then(result => {
      if (result.data) setKeyPoints(result.data);
      else setError(result.error);
      setLoading(false);
    });
  }, []);

  const handleScoreChange = (name: string, delta: number) => {
    setKeyPoints(prev => prev.map(kp => kp.name === name ? {...kp, score: kp.score + delta} : kp));
    setDirty(true);
  };

  const handleDelete = (name: string) => {
    setKeyPoints(prev => prev.filter(kp => kp.name !== name));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const result = await saveMemory(keyPoints);
    setSaving(false);
    if (result.data) {
      setDirty(false);
      onClose();
    } else {
      setError(result.error);
    }
  };

  return (
    <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in backdrop-blur-sm'>
      <div className='bg-vscode-sidebar border border-vscode-border rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden m-4'>
        <div className='flex items-center justify-between px-6 py-4 border-b border-vscode-border bg-vscode-element/50'>
          <h2 className='text-lg font-semibold text-vscode-text-header'>{t.memory.title}</h2>
          <button
            onClick={onClose}
            className='text-vscode-text-muted hover:text-vscode-text p-1 rounded-md hover:bg-vscode-border transition-colors'
          >
            <X size={18} />
          </button>
        </div>

        <div className='p-6 max-h-[70vh] overflow-y-auto'>
          {error && <p className='text-red-400 text-sm text-center py-2 mb-3'>{error}</p>}
          {loading
            ? <p className='text-vscode-text-muted text-center py-8'>{t.memory.loading}</p>
            : keyPoints.length === 0 && !error
            ? <p className='text-vscode-text-muted text-center py-8'>{t.memory.empty}</p>
            : (
              <div className='space-y-3'>
                {keyPoints.map(kp => (
                  <div
                    key={kp.name}
                    className='flex items-start gap-3 p-3 rounded-lg bg-vscode-element/50 border border-vscode-border group'
                  >
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm text-vscode-text leading-relaxed'>{kp.text}</p>
                    </div>
                    <div className='flex items-center gap-1.5 shrink-0'>
                      <button
                        onClick={() => handleScoreChange(kp.name, -1)}
                        className='p-1 rounded hover:bg-white/10 light:hover:bg-black/10 text-vscode-text-muted hover:text-vscode-text transition-colors'
                        title={t.memory.decreaseScore}
                      >
                        <Minus size={14} />
                      </button>
                      <span
                        className={`text-xs font-mono w-8 text-center ${
                          kp.score > 0
                            ? 'text-green-400'
                            : kp.score < 0
                            ? 'text-red-400'
                            : 'text-vscode-text-muted'
                        }`}
                      >
                        {kp.score > 0 ? `+${kp.score}` : kp.score}
                      </span>
                      <button
                        onClick={() => handleScoreChange(kp.name, 1)}
                        className='p-1 rounded hover:bg-white/10 light:hover:bg-black/10 text-vscode-text-muted hover:text-vscode-text transition-colors'
                        title={t.memory.increaseScore}
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(kp.name)}
                        className='p-1 rounded hover:bg-red-500/20 text-vscode-text-muted hover:text-red-400 transition-colors ml-1'
                        title={t.memory.delete}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>

        <div className='flex justify-end gap-3 px-6 py-4 border-t border-vscode-border'>
          <button
            onClick={onClose}
            className='px-4 py-2 text-sm text-vscode-text-muted hover:text-vscode-text rounded-md hover:bg-vscode-element transition-colors'
          >
            {t.memory.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              !dirty || saving
                ? 'bg-vscode-accent/50 text-white/50 cursor-not-allowed'
                : 'bg-vscode-accent text-white hover:brightness-110'
            }`}
          >
            {saving ? t.memory.saving : t.memory.save}
          </button>
        </div>
      </div>
    </div>
  );
}
