'use client';

import RouteError from '@/components/error/RouteError';
import { PageFrame } from '@/components/kit/layout/PageFrame';

export default function StatsError({ retry }: { retry: () => void }) {
  return (
    <PageFrame>
      <RouteError title="Statistics could not load" retry={retry} />
    </PageFrame>
  );
}
