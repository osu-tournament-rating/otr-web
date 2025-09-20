'use client';

import { useContext } from 'react';

import { SessionContext } from '@/components/session-provider';
import type { SessionUser } from '@/lib/auth/session-utils';

export function useSession(): SessionUser | null {
  const context = useContext(SessionContext);
  return context.user;
}
