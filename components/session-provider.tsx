'use client';

import React, { createContext, useEffect, useState, ReactNode } from 'react';

import type { SessionUser } from '@/lib/auth/session-utils';

interface SessionContextType {
  user: SessionUser | null;
  refreshSession: (newUser: SessionUser | null) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const SessionContext = createContext<SessionContextType>({
  user: null,
  refreshSession: () => {},
  isLoading: false,
  setLoading: () => {},
});

export default function SessionProvider({
  user,
  children,
}: {
  user: SessionUser | null;
  children: ReactNode;
}) {
  const [currentUser, setCurrentUser] = useState(user);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCurrentUser(user);
    setIsLoading(false);
  }, [user]);

  const refreshSession = (newUser: SessionUser | null) => {
    setCurrentUser(newUser);
    setIsLoading(false);
  };

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
  };

  const contextValue: SessionContextType = {
    user: currentUser,
    refreshSession,
    isLoading,
    setLoading,
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}
