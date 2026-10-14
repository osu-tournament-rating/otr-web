'use client';

import { Button } from '../ui/button';
import { authClient } from '@/lib/auth/auth-client';
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuthRedirectPath } from '@/lib/hooks/useAbsolutePath';
import { isTailnetPreview, signInE2eAdmin } from '@/lib/auth/e2e-auth';
import { toast } from 'sonner';

const LOGIN_STORAGE_KEY = 'otr:isLoggingIn';
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Storage throws when the browser blocks site data. The flag only keeps the
// spinner up across the OAuth redirect, so sign-in works without it.
function readLoginFlag(): boolean {
  try {
    return sessionStorage.getItem(LOGIN_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeLoginFlag(isLoggingIn: boolean) {
  try {
    if (isLoggingIn) {
      sessionStorage.setItem(LOGIN_STORAGE_KEY, 'true');
    } else {
      sessionStorage.removeItem(LOGIN_STORAGE_KEY);
    }
  } catch {
    // Nothing to persist.
  }
}

export default function LoginButton() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const sessionRefreshTriggeredRef = useRef(false);
  const { isPending: sessionPending } = authClient.useSession();
  const path = useAuthRedirectPath();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (readLoginFlag()) {
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
        writeLoginFlag(false);
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
        writeLoginFlag(true);

        sessionRefreshTriggeredRef.current = false;
        setIsLoggingIn(true);

        if (isTailnetPreview()) {
          try {
            await signInE2eAdmin();
            window.location.assign(path);
          } catch (error) {
            toast.error(
              'Error occurred: ' +
                (error instanceof Error ? error.message : String(error))
            );

            writeLoginFlag(false);
            sessionRefreshTriggeredRef.current = false;
            await delay(1000);
            setIsLoggingIn(false);
          }

          return;
        }

        const { error } = await authClient.signIn.social({
          provider: 'osu',
          callbackURL: path,
        });

        if (error) {
          toast.error('Error occurred: ' + error.message);

          writeLoginFlag(false);

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
