'use client';

import { useTransition } from 'react';
import { catchError, type ErrorInfo } from 'next/error';

import SectionError from '@/components/error/SectionError';
import { Card } from '@/components/ui/card';

type SectionErrorBoundaryProps = {
  title: string;
  description?: string;
};

function SectionErrorFallback(
  { title, description }: SectionErrorBoundaryProps,
  { retry }: ErrorInfo
) {
  const [retrying, startRetry] = useTransition();

  return (
    <Card className="py-0">
      <SectionError
        title={title}
        description={description}
        retrying={retrying}
        onRetry={() => startRetry(retry)}
      />
    </Card>
  );
}

/**
 * Keeps a failed server-rendered section from taking down the rest of the
 * page. Its retry re-renders the page on the server.
 */
const SectionErrorBoundary = catchError(SectionErrorFallback);

export default SectionErrorBoundary;
