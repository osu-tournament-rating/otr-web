'use client';

import { SessionContext } from '@/components/session-provider';
import { UserDTO } from '@osu-tournament-rating/otr-api-client';
import { useContext } from 'react';

export function useSession(): UserDTO | null {
  return useContext(SessionContext);
}
