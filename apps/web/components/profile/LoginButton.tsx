'use client';

import { LogIn } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button, type ButtonSize } from '@/components/kit/controls/Button';
import { authClient } from '@/lib/auth/auth-client';
import { isTailnetPreview, signInE2eAdmin } from '@/lib/auth/e2e-auth';
import { useAuthRedirectPath } from '@/lib/hooks/useAbsolutePath';

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

/**
 * Signs in with osu!. The button keeps its spinner across the OAuth redirect
 * until the session has loaded. Tailnet previews sign in as the e2e admin.
 */
export default function LoginButton({
  size = 'default',
  className,
}: {
  size?: ButtonSize;
  className?: string;
}) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const sessionRefreshTriggeredRef = useRef(false);
  const { isPending: sessionPending } = authClient.useSession();
  const path = useAuthRedirectPath();

  useEffect(() => {
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

    if (sessionRefreshTriggeredRef.current) {
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

  const fail = async (message: string) => {
    toast.error('Error occurred: ' + message);
    writeLoginFlag(false);
    sessionRefreshTriggeredRef.current = false;
    await delay(1000);
    setIsLoggingIn(false);
  };

  const logIn = async () => {
    writeLoginFlag(true);
    sessionRefreshTriggeredRef.current = false;
    setIsLoggingIn(true);

    if (isTailnetPreview()) {
      try {
        await signInE2eAdmin();
        window.location.assign(path);
      } catch (error) {
        await fail(error instanceof Error ? error.message : String(error));
      }

      return;
    }

    const { error } = await authClient.signIn.social({
      provider: 'osu',
      callbackURL: path,
    });

    if (error) {
      await fail(error.message ?? String(error));
    }
  };

  return (
    <Button
      size={size}
      icon={LogIn}
      pending={isLoggingIn}
      onClick={() => void logIn()}
      className={className}
    >
      {isLoggingIn ? 'Logging in…' : 'Log in'}
    </Button>
  );
}
