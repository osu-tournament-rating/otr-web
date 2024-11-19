import { useContext } from 'react';
import { ErrorContext, SetErrorContext } from './ErrorContext';
import { UserLoggedContext } from './UserLoggedContext';

export function useUser() {
  const context = useContext(UserLoggedContext);

  if (!context) {
    throw new Error("Context for 'useUser' was not initialized");
  }

  return context;
}

export function useError() {
  return useContext(ErrorContext);
}

export function useSetError() {
  return useContext(SetErrorContext);
}
