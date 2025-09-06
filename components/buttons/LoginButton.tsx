'use client';

import { Button } from '../ui/button';
import { authClient } from '@/lib/auth-client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuthRedirectPath } from '@/lib/hooks/useAbsolutePath';
import { toast } from 'sonner';

export default function LoginButton() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const path = useAuthRedirectPath();

  return (
    <Button
      className="cursor-pointer"
      onClick={async () => {
        setIsLoggingIn(true);
        const { error } = await authClient.signIn.oauth2({
          providerId: 'osu',
          callbackURL: path,
        });

        if (error) {
          toast.error('Error occurred: ' + error.message);
          setIsLoggingIn(false);
          return;
        }
      }}
    >
      {isLoggingIn ? <Loader2 className="animate-spin" /> : 'Login'}
    </Button>
  );
}
