'use client';

import { getSessionData } from '@/app/actions/session';
import { SessionUser } from '@/lib/types';
import {
  createContext,
  useCallback,
  useEffect,
  useState,
} from 'react';

import type { ReactNode } from 'react';

interface UserContextProps {
  user: SessionUser | undefined;
  logout: () => void;
}

export const UserLoggedContext = createContext<UserContextProps | undefined>(undefined);

export default function UserProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<SessionUser | undefined>(undefined);

  const fetchUser = useCallback(async () => {
    const sessionData = await getSessionData();
    setUser(sessionData);
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = useCallback(() => {
    setUser(undefined);
  }, []);

  return (
    <UserLoggedContext.Provider value={{ user, logout }}>
      {children}
    </UserLoggedContext.Provider>
  );
}