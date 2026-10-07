import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { AuthContext, type AuthContextValue } from './authContextValue';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    let active = true;
    void client.auth.getSession().then(({ data, error }) => {
      if (active) {
        if (error) console.error('Could not restore Supabase session.', error);
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    loading,
    configured: isSupabaseConfigured,
    signIn: async (email, password) => {
      const client = getSupabaseClient();
      if (!client) throw new Error('Supabase Auth is not configured.');
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signOut: async () => {
      const client = getSupabaseClient();
      if (!client) return;
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },
  }), [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
