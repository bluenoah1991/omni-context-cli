import { useEffect, useState } from 'react';
import { useLocale } from '../i18n';
import { login } from '../services/authService';

export default function LoginPage({onSuccess}: {onSuccess: () => void;}) {
  const t = useLocale();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [lockout, setLockout] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (lockout <= 0) return;
    const timer = setTimeout(() => setLockout(lockout - 1), 1000);
    return () => clearTimeout(timer);
  }, [lockout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || lockout > 0) return;
    setError('');
    setSubmitting(true);

    const result = await login(password);
    setSubmitting(false);

    if (result.ok) {
      onSuccess();
    } else if (result.status === 429) {
      setLockout(result.retryAfter || 30);
    } else {
      setError(
        result.status === 0 ? t.login.connectionFailed : (result.error || t.login.wrongPassword),
      );
    }
  };

  return (
    <div className='flex items-center justify-center min-h-screen bg-vscode-bg text-vscode-text'>
      <div className='w-full max-w-85 px-5'>
        <h1 className='text-[22px] font-semibold text-center mb-7 tracking-wide text-vscode-text-header'>
          OmniContext Web CLI
        </h1>
        <form onSubmit={handleSubmit}>
          <input
            type='password'
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={t.login.placeholder}
            autoComplete='current-password'
            autoFocus
            className='w-full px-3 py-2.5 bg-vscode-element border border-vscode-border rounded-md text-vscode-text text-[15px] outline-none focus:border-vscode-border-active mb-3'
          />
          <button
            type='submit'
            disabled={submitting || lockout > 0}
            className='w-full py-2.5 bg-vscode-text text-vscode-bg border-none rounded-md text-sm font-medium cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed'
          >
            {t.login.signIn}
          </button>
          <div className='text-[13px] mt-3.5 text-center min-h-4.5'>
            {lockout > 0 && (
              <span className='text-vscode-warning'>{t.login.tooManyAttempts(lockout)}</span>
            )}
            {lockout === 0 && error && <span className='text-vscode-error'>{error}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
