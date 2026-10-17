'use client';

import { useTransition } from 'react';
import { catchError, type ErrorInfo } from 'next/error';

import SectionError from '@/components/error/SectionError';
import { Panel } from '@/components/kit/layout/Panel';

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
    <Panel>
      <SectionError
        title={title}
        description={description}
        retrying={retrying}
        onRetry={() => startRetry(retry)}
      />
    </Panel>
  );
}

/**
 * Keeps a failed server-rendered section from taking down the rest of the
 * page. It takes the section's place as a panel, and its retry re-renders the
 * page on the server.
 */
const SectionErrorBoundary = catchError(SectionErrorFallback);

export default SectionErrorBoundary;
