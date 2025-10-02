'use client';

import { Button } from '../ui/button';
import { authClient } from '@/lib/auth/auth-client';
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuthRedirectPath } from '@/lib/hooks/useAbsolutePath';
import { toast } from 'sonner';

const LOGIN_STORAGE_KEY = 'otr:isLoggingIn';
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function LoginButton() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const sessionRefreshTriggeredRef = useRef(false);
  const { isPending: sessionPending } = authClient.useSession();
  const path = useAuthRedirectPath();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (sessionStorage.getItem(LOGIN_STORAGE_KEY) === 'true') {
      sessionRefreshTriggeredRef.current = true;
      setIsLoggingIn(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoggingIn) {
      return;
    }

    if (sessionPending) {
      sessionRefreshTriggeredRef.current = true;
      return;
    }

    if (!sessionPending && sessionRefreshTriggeredRef.current) {
      let cancelled = false;

      const finish = async () => {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(LOGIN_STORAGE_KEY);
        }
        await delay(10000);

        if (!cancelled) {
          setIsLoggingIn(false);
          sessionRefreshTriggeredRef.current = false;
        }
      };

      void finish();

      return () => {
        cancelled = true;
      };
    }
  }, [isLoggingIn, sessionPending]);

  return (
    <Button
      className="cursor-pointer"
      onClick={async () => {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(LOGIN_STORAGE_KEY, 'true');
        }

        sessionRefreshTriggeredRef.current = false;
        setIsLoggingIn(true);
        const { error } = await authClient.signIn.oauth2({
          providerId: 'osu',
          callbackURL: path,
        });

        if (error) {
          toast.error('Error occurred: ' + error.message);

          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(LOGIN_STORAGE_KEY);
          }

          sessionRefreshTriggeredRef.current = false;
          await delay(1000);
          setIsLoggingIn(false);
        }
      }}
    >
      {isLoggingIn ? <Loader2 className="animate-spin" /> : 'Login'}
    </Button>
  );
}
