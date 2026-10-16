'use client';

import RouteError from '@/components/error/RouteError';
import { PageFrame } from '@/components/kit/layout/PageFrame';

// Any route without its own error screen lands here.
export default function AppError({ retry }: { retry: () => void }) {
  return (
    <PageFrame>
      <RouteError title="This page could not load" retry={retry} />
    </PageFrame>
  );
}
