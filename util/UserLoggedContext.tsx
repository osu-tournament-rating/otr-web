'use client';

import { createContext, useState, } from 'react';

import type { ReactNode } from 'react';
import { UserDTO } from '@osu-tournament-rating/otr-api-client';

interface UserContextProps {
  /** The currently logged-in user */
  user: UserDTO | undefined;

  /** Clears the currently logged-in user on the client side */
  logout: () => void;
}

export const UserLoggedContext = createContext<UserContextProps | undefined>(undefined);

export default function UserProvider({
  initialUser,
  children
}: {
  initialUser?: UserDTO;
  children: ReactNode
}) {
  const [user, setUser] = useState<UserDTO | undefined>(initialUser);

  const logout = () => {
    setUser(undefined);
  }

  return (
    <UserLoggedContext.Provider value={{ user, logout }}>
      {children}
    </UserLoggedContext.Provider>
  );
}