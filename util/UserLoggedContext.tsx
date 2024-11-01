'use client';

import { getSessionData } from '@/app/actions/session';
import { SessionUser } from '@/lib/types';
import {
  createContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { ReactNode } from 'react';

export const UserLoggedContext = createContext<SessionUser | undefined>(undefined);

export default function UserProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<SessionUser | undefined>(undefined);

  useEffect(() => {
    getSessionData().then((sessionData) => { setUser(sessionData) });
  }, []);

  return (
    <UserLoggedContext.Provider value={useMemo(() => user, [user])}>
      {children}
    </UserLoggedContext.Provider>
  );
}