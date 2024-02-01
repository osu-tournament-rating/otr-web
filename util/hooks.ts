import { useContext } from 'react';
import { UserLoggedContext } from './UserLoggedContext';

export function useUser() {
  return useContext(UserLoggedContext);
}
