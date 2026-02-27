import { useCallback, useEffect } from 'react';
import { checkAuth } from '../services/authService';
import { useChatStore } from '../store/chatStore';
import LoginPage from './LoginPage';

export default function AuthGate({children}: {children: React.ReactNode;}) {
  const {needsAuth, setNeedsAuth} = useChatStore();

  useEffect(() => {
    checkAuth().then(ok => setNeedsAuth(!ok));
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setNeedsAuth(false);
  }, []);

  if (needsAuth === true) return <LoginPage onSuccess={handleLoginSuccess} />;
  if (needsAuth === null) return null;

  return <>{children}</>;
}
