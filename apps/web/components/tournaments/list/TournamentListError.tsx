'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import SectionError from '@/components/error/SectionError';

/**
 * Takes the rows' place when the list could not load. The toolbar stays, so
 * the visitor can change the search; Try again renders the page again.
 */
export default function TournamentListError() {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();

  return (
    <SectionError
      title="Tournaments could not load"
      description="The archive is temporarily unavailable. Try the request again."
      retrying={retrying}
      onRetry={() => startRetry(() => router.refresh())}
    />
  );
}
