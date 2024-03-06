'use client';
import { getSession } from '@/app/actions';
/* import { User } from '@/lib/types'; */
import {
  DependencyList,
  createContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { ReactNode } from 'react';

export const UserLoggedContext = createContext<object | undefined>(undefined);

type Props = {
  children: ReactNode;
};

function useAsyncEffect(effect: () => Promise<void>, deps?: DependencyList) {
  useEffect(() => {
    effect();
  }, deps);
}

export default function UserProvider({ children }: Props): JSX.Element {
  const [user, setUser] = useState<object | undefined>(undefined);

  useAsyncEffect(async (): Promise<void> => {
    let resp: object | undefined = await getSession(true);

    setUser(resp);
  }, []);

  return (
    <UserLoggedContext.Provider value={useMemo(() => user, [user])}>
      {children}
    </UserLoggedContext.Provider>
  );
}
