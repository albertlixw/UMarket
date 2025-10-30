import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext(undefined);

function isUmassEmail(email) {
  return typeof email === 'string' && email.toLowerCase().endsWith('@umass.edu');
}

function extractErrorMessage(error) {
  if (!error) return '';
  return (
    (typeof error.message === 'string' && error.message) ||
    (typeof error.error_description === 'string' && error.error_description) ||
    ''
  );
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authNotice, setAuthNotice] = useState(null);

  const showUmassNotice = useCallback(() => {
    setAuthNotice({
      id: Date.now(),
      title: 'UMass account required',
      message: 'Please sign in with your UMass Amherst email address to continue.',
    });
  }, []);

  const showGenericNotice = useCallback(() => {
    setAuthNotice({
      id: Date.now(),
      title: 'Sign-in issue',
      message: 'We could not start Google sign-in. Please try again in a moment.',
    });
  }, []);

  const clearAuthNotice = useCallback(() => setAuthNotice(null), []);

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            hd: 'umass.edu',
          },
        },
      });
      if (error) {
        const message = extractErrorMessage(error).toLowerCase();
        if (message.includes('umass.edu') || message.includes('umass')) {
          showUmassNotice();
        } else if (!message.includes('popup closed')) {
          showGenericNotice();
        }
        throw error;
      }
    } catch (error) {
      const message = extractErrorMessage(error).toLowerCase();
      if (message.includes('umass.edu') || message.includes('umass')) {
        showUmassNotice();
      } else if (message && !message.includes('popup closed') && !message.includes('cancelled')) {
        showGenericNotice();
      }
      throw error;
    }
  }, [showGenericNotice, showUmassNotice]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (error) {
          console.error('Error loading session', error);
          setSession(null);
          setUser(null);
        } else {
          const nextSession = data?.session ?? null;
          const email = nextSession?.user?.email ?? '';
          if (nextSession && email && !isUmassEmail(email)) {
            showUmassNotice();
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
          } else {
            setSession(nextSession);
            setUser(nextSession?.user ?? null);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInitialSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      const email = newSession?.user?.email ?? '';
      if (email && !isUmassEmail(email)) {
        showUmassNotice();
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [showUmassNotice]);

  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      accessToken: session?.access_token ?? null,
      authNotice,
      clearAuthNotice,
      signInWithGoogle,
      signOut,
    }),
    [session, user, loading, authNotice, clearAuthNotice, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
