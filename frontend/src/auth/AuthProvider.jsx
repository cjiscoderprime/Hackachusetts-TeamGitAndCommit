import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
const projectUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
let client = null, configurationError = '';
try { if (projectUrl && publishableKey) client = createClient(projectUrl, publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }); }
catch { configurationError = 'Authentication configuration is invalid. Check the Supabase project URL and publishable key.'; }
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export async function getAccessToken() {
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error) throw new Error('Unable to retrieve your sign-in session. Please sign in again.');
  return data.session?.access_token || null;
}
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null), [loading, setLoading] = useState(Boolean(client)), [error, setError] = useState(configurationError);
  useEffect(() => {
    if (!client) return;
    let active = true, version = 0;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, next) => {
      version++; if (active) { setSession(next); setLoading(false); setError(''); }
    });
    const initialVersion = version;
    client.auth.getSession().then(({ data, error: failure }) => {
      if (!active || version !== initialVersion) return;
      setSession(data.session); setError(failure?.message || ''); setLoading(false);
    }).catch(() => { if (active && version === initialVersion) { setError('Unable to restore your sign-in session.'); setLoading(false); } });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  const value = {
    client, configured: Boolean(client), configurationError, session, user: session?.user || null, loading, error,
    getAccessToken,
    async signOut() {
      if (!client) return;
      const { error: failure } = await client.auth.signOut({ scope: 'local' });
      if (failure) throw failure;
      setSession(null);
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
