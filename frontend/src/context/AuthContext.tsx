import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../api/supabase';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithTestAccount: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('gadsik_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const signInWithTestAccount = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const email = 'tarigondaganesh1234@gmail.com';
      const password = 'Ganesh9618@gsg';

      let session = (await supabase.auth.signInWithPassword({ email, password })).data?.session;
      if (!session) {
        const signUpRes = await supabase.auth.signUp({ email, password });
        if (signUpRes.data?.session) {
          session = signUpRes.data.session;
        } else {
          const retryRes = await supabase.auth.signInWithPassword({ email, password });
          if (retryRes.error) throw retryRes.error;
          session = retryRes.data?.session;
        }
      }

      if (session) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        setToken(session.access_token);
        localStorage.setItem('gadsik_token', session.access_token);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate test account');
      console.error('Test login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (session && !sessionError) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        setToken(session.access_token);
        localStorage.setItem('gadsik_token', session.access_token);
      } else {
        // Auto-login with test account
        signInWithTestAccount().catch(() => {});
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        setToken(session.access_token);
        localStorage.setItem('gadsik_token', session.access_token);
      } else {
        setUser(null);
        setToken(null);
        localStorage.removeItem('gadsik_token');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      if (data.session) {
        setUser({ id: data.session.user.id, email: data.session.user.email || '' });
        setToken(data.session.access_token);
        localStorage.setItem('gadsik_token', data.session.access_token);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;
      if (data.session) {
        setUser({ id: data.session.user.id, email: data.session.user.email || '' });
        setToken(data.session.access_token);
        localStorage.setItem('gadsik_token', data.session.access_token);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setToken(null);
      localStorage.removeItem('gadsik_token');
    } catch (err: any) {
      setError(err.message || 'Failed to sign out');
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        error,
        signIn,
        signUp,
        signInWithTestAccount,
        signOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
