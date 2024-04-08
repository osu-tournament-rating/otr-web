'use client';
import { AnimatePresence } from 'framer-motion';
import { createContext, useEffect, useMemo, useState } from 'react';

import ErrorToast from '@/components/ErrorToast/ErrorToast';

import type { ReactNode } from 'react';

export const ErrorContext = createContext<object | undefined>(undefined);

export const SetErrorContext = createContext<object | undefined>(undefined);

type Props = {
  children: ReactNode;
};

export default function ErrorProvider({ children }: Props): JSX.Element {
  const [error, setError] = useState<object | undefined>(undefined);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!error || show) return;

    if (error?.message === 'No access token cookie found.') return;

    if (error?.status === 401 && error?.message == '') return;

    setShow(true);
    setTimeout(() => {
      setError(undefined);
      setShow(false);
    }, 7000);
  }, [error, show]);

  return (
    <SetErrorContext.Provider value={useMemo(() => setError, [setError])}>
      <ErrorContext.Provider value={useMemo(() => error, [error])}>
        <AnimatePresence>
          {show && (
            <ErrorToast
              message={error?.message}
              status={error?.status}
              text={error?.text}
            />
          )}
        </AnimatePresence>
        {children}
      </ErrorContext.Provider>
    </SetErrorContext.Provider>
  );
}
