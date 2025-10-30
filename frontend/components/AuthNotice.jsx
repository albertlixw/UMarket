import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthNotice() {
  const { authNotice, clearAuthNotice } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!authNotice) return undefined;
    const timer = setTimeout(() => {
      clearAuthNotice();
    }, 5200);
    return () => clearTimeout(timer);
  }, [authNotice, clearAuthNotice]);

  if (!mounted || !authNotice) {
    return null;
  }

  return createPortal(
    <div className="auth-toast" role="status" aria-live="polite" key={authNotice.id}>
      <div className="auth-toast__icon" aria-hidden="true">
        <span className="auth-toast__icon-text">UM</span>
      </div>
      <div className="auth-toast__content">
        <p className="auth-toast__title">{authNotice.title}</p>
        <p className="auth-toast__message">{authNotice.message}</p>
      </div>
      <button
        type="button"
        className="auth-toast__close"
        onClick={clearAuthNotice}
        aria-label="Dismiss notification"
      >
        x
      </button>
    </div>,
    document.body,
  );
}
