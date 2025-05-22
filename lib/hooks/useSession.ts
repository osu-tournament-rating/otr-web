'use client';

import { SessionContext } from '@/components/session-provider';
import { UserDTO } from '@osu-tournament-rating/otr-api-client';
import { useContext, useCallback } from 'react';
import { me } from '@/lib/api/client';
import { withRequestCache } from '@/lib/utils/request-cache';

export function useSession(): UserDTO | null {
  const context = useContext(SessionContext);
  return context.user;
}

export function useSessionRefresh() {
  const { refreshSession, setLoading } = useContext(SessionContext);
  
  const refresh = useCallback(async (): Promise<UserDTO | null> => {
    setLoading(true);
    
    return withRequestCache('client-session-refresh', async () => {
      try {
        const { result } = await me.get();
        refreshSession(result);
        return result;
      } catch (error) {
        console.error('Failed to refresh session:', error);
        refreshSession(null);
        return null;
      }
    }, 2000); // 2 second cache for client-side requests
  }, [refreshSession, setLoading]);

  return refresh;
}
