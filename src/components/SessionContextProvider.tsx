"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, getToken, removeToken, setToken, type User } from '@/lib/apiClient';
import { Skeleton } from '@/components/ui/skeleton';

export interface Session {
  user: User;
}

interface SessionContextType {
  session: Session | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const logout = useCallback(() => {
    removeToken();
    setSession(null);
    navigate('/login');
  }, [navigate]);

  const login = useCallback((token: string, user: User) => {
    setToken(token);
    setSession({ user });
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    api.get<{ user: User }>('/api/auth/me')
      .then(({ user }) => setSession({ user }))
      .catch(() => removeToken())
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!isLoading && !session && location.pathname !== '/login') {
      navigate('/login');
    }
    if (!isLoading && session && location.pathname === '/login') {
      navigate('/');
    }
  }, [session, isLoading, location.pathname, navigate]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[hsl(var(--background))] p-4">
        <Skeleton className="h-12 w-48 mb-4 bg-[hsl(var(--secondary-black))]" />
        <Skeleton className="h-8 w-64 mb-2 bg-[hsl(var(--secondary-black))]" />
        <Skeleton className="h-8 w-64 bg-[hsl(var(--secondary-black))]" />
      </div>
    );
  }

  return (
    <SessionContext.Provider value={{ session, isLoading, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};
