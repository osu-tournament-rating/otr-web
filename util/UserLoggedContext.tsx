'use client';

import { logout as serverLogout } from '@/app/actions/session';
import { createContext, useState } from 'react';

import type { ReactNode } from 'react';
import { UserDTO } from '@osu-tournament-rating/otr-api-client';

interface UserContextProps {
  /** The currently logged-in user */
  user: UserDTO | undefined;

  /** Logs out of the current session */
  logout: () => void;
}

export const UserLoggedContext = createContext<UserContextProps | undefined>(
  undefined
);

export default function UserProvider({
  initialUser,
  children,
}: {
  initialUser?: UserDTO;
  children: ReactNode;
}) {
  const [user, setUser] = useState<UserDTO | undefined>(initialUser);

  const logout = () => {
    setUser(undefined);
    return serverLogout();
  };

  return (
    <UserLoggedContext.Provider value={{ user, logout }}>
      {children}
    </UserLoggedContext.Provider>
  );
}
