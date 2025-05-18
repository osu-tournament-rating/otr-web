'use client';

import { me } from '@/lib/api/client';
import { UserDTO } from '@osu-tournament-rating/otr-api-client';
import React, { createContext } from 'react';
import useSWR from 'swr';

export const SessionContext = createContext<UserDTO | null>(null);

export default function SessionProvider({
  user,
  children,
}: {
  user: UserDTO | null;
  children: React.ReactNode;
}) {
  const { data } = useSWR(
    'session',
    async () => {
      if (user) {
        return user;
      }

      const { result } = await me.get();
      return result;
    },
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  return (
    <SessionContext.Provider value={data ?? null}>
      {children}
    </SessionContext.Provider>
  );
}
