'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { handleAuthCallback } from '@/lib/actions/auth-callback';
import Image from 'next/image';

interface NextRedirectError extends Error {
  digest?: string;
}

function isNextRedirectError(error: unknown): error is NextRedirectError {
  if (!(error instanceof Error)) return false;
  if (!('digest' in error)) return false;
  const digest = (error as NextRedirectError).digest;
  return typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT');
}

export default function Page() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const redirectTo = searchParams.get('redirectTo') || '/';

        // Wait a moment for cookies to bake and blobs to roll
        await new Promise((resolve) => setTimeout(resolve, 800));

        await handleAuthCallback(redirectTo);
      } catch (err: unknown) {
        // NEXT_REDIRECT is expected behavior, not an error
        if (isNextRedirectError(err)) {
          return; // This is normal redirect behavior
        }

        console.error('Auth callback error:', err);
        setError('Authentication failed. Please try logging in again.');
      }
    };

    processCallback();
  }, [searchParams]);

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center space-y-4">
        <p className="text-destructive">{error}</p>
        <button
          onClick={() => (window.location.href = '/')}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center space-y-4">
      <Image
        src={'/images/blobrollfast.webp'}
        width={32}
        height={32}
        alt="blobrollfast"
        unoptimized
      />
      <p>Logging in... </p>
    </div>
  );
}
