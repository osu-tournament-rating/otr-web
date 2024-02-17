import { useContext } from 'react';
import { ErrorContext, SetErrorContext } from './ErrorContext';
import { UserLoggedContext } from './UserLoggedContext';

export function useUser() {
  return useContext(UserLoggedContext);
}

export function useError() {
  return useContext(ErrorContext);
}

export function useSetError() {
  return useContext(SetErrorContext);
}
