'use client';

import { useEffect, useState } from 'react';

import { authClient } from '@/lib/auth/auth-client';
import { orpc } from '@/lib/orpc/orpc';

type CurrentUserProfile = Awaited<ReturnType<typeof orpc.users.me>>;

type SessionData = ReturnType<typeof authClient.useSession>['data'];

type UseCurrentUserProfile = {
  session: SessionData;
  profile: CurrentUserProfile | null;
  isLoading: boolean;
  isSessionPending: boolean;
  isProfileLoading: boolean;
};

export function useCurrentUserProfile(): UseCurrentUserProfile {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const sessionId = session?.session.id;

  useEffect(() => {
    // useEffect is necessary here to fetch profile data once the BetterAuth session hydrates on the client.
    if (!sessionId) {
      setProfile(null);
      setIsProfileLoading(false);
      return;
    }

    let isActive = true;
    setIsProfileLoading(true);

    orpc.users
      .me()
      .then((result) => {
        if (isActive) {
          setProfile(result);
        }
      })
      .catch((error) => {
        console.error('Failed to load current user profile', error);
        if (isActive) {
          setProfile(null);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsProfileLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [sessionId]);

  return {
    session,
    profile,
    isLoading: isSessionPending || isProfileLoading,
    isSessionPending,
    isProfileLoading,
  };
}

export type { CurrentUserProfile };
