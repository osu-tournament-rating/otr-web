import { useContext } from 'react';
import { UserLoggedContext } from './UserLoggedContext';

export function useUser() {
  const context = useContext(UserLoggedContext);

  if (!context) {
    throw new Error("Context for 'useUser' was not initialized");
  }

  return context;
}