'use client';

import RouteError from '@/components/error/RouteError';
import { PageFrame } from '@/components/kit/layout/PageFrame';

export default function PlayerError({ retry }: { retry: () => void }) {
  return (
    <PageFrame>
      <RouteError
        title="Player could not load"
        back={{ href: '/leaderboard', label: 'Leaderboard' }}
        retry={retry}
      />
    </PageFrame>
  );
}
