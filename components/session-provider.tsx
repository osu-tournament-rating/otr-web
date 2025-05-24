'use client';

import { UserDTO } from '@osu-tournament-rating/otr-api-client';
import React, { createContext, useEffect, useState, ReactNode } from 'react';

interface SessionContextType {
  user: UserDTO | null;
  refreshSession: (newUser: UserDTO | null) => void;
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
  user: UserDTO | null;
  children: ReactNode;
}) {
  const [currentUser, setCurrentUser] = useState(user);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCurrentUser(user);
    setIsLoading(false);
  }, [user]);

  const refreshSession = (newUser: UserDTO | null) => {
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
