'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { refreshServerSession } from '@/lib/actions/session';
import Image from 'next/image';

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyAndRedirect = async () => {
      try {
        const redirectTo = searchParams.get('redirectTo') || '/';

        // Wait a moment
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Only use server-side session refresh to avoid multiple API calls
        const serverResult = await refreshServerSession(redirectTo);

        if (serverResult.success) {
          // Server session established, redirect and let layout handle the rest
          router.replace(redirectTo);
        } else {
          // If server refresh failed, wait a bit longer and try once more
          await new Promise((resolve) => setTimeout(resolve, 1200));
          const retryResult = await refreshServerSession(redirectTo);

          if (retryResult.success) {
            router.replace(redirectTo);
          } else {
            setError('Authentication failed. Please try logging in again.');
          }
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('An error occurred during authentication.');
      }
    };

    verifyAndRedirect();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center space-y-4">
        <p className="text-destructive">{error}</p>
        <button
          onClick={() => router.push('/')}
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
      />
      <p>Logging in... </p>
    </div>
  );
}
