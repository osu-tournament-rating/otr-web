'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
// TODO: This page should be removed
export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const redirectTo = searchParams.get('redirectTo') || '/';

    const timer = window.setTimeout(() => {
      router.replace(redirectTo);
    }, 800);

    return () => window.clearTimeout(timer);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center space-y-4">
      <Image
        src="/images/blobrollfast.webp"
        width={32}
        height={32}
        alt="Logging in"
        unoptimized
      />
      <p>Logging in...</p>
    </div>
  );
}
