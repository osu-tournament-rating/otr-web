'use client';

import RouteError from '@/components/error/RouteError';

export default function StatsError({ retry }: { retry: () => void }) {
  return <RouteError title="Statistics could not load" retry={retry} />;
}
