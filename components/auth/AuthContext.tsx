'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthSession } from '@/lib/types/auth';

interface AuthContextType {
  session: AuthSession | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();

      if (data.success && data.authenticated) {
        setSession(data.session);
        // Also store in localStorage for quick access
        localStorage.setItem('taghere_session', JSON.stringify(data.session));
      } else {
        setSession(null);
        localStorage.removeItem('taghere_session');
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setSession(null);
      localStorage.removeItem('taghere_session');
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success && data.session) {
        setSession(data.session);
        localStorage.setItem('taghere_session', JSON.stringify(data.session));
        localStorage.setItem('taghere_auth', 'true');
        localStorage.setItem('taghere_timestamp', Date.now().toString());
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Network error' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setSession(null);
      localStorage.removeItem('taghere_session');
      localStorage.removeItem('taghere_auth');
      localStorage.removeItem('taghere_timestamp');
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, login, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
