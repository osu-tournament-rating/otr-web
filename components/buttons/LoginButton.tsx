'use client';

import { Button } from '../ui/button';
import { login } from '@/lib/actions/auth';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAbsolutePath } from '@/lib/hooks/useAbsolutePath';

export default function LoginButton() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const path = useAbsolutePath();

  return (
    <Button
      className="cursor-pointer"
      onClick={() => {
        setIsLoggingIn(true);
        login(path);
      }}
    >
      {isLoggingIn ? <Loader2 className="animate-spin" /> : 'Login'}
    </Button>
  );
}
