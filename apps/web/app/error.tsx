'use client';

import RouteError from '@/components/error/RouteError';

// Any route without its own error screen lands here.
export default function AppError({ retry }: { retry: () => void }) {
  return <RouteError title="This page could not load" retry={retry} />;
}
