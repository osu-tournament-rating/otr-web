'use client';

import RouteError from '@/components/error/RouteError';
import { PageFrame } from '@/components/kit/layout/PageFrame';

export default function LeaderboardError({ retry }: { retry: () => void }) {
  return (
    <PageFrame>
      <RouteError title="Leaderboard could not load" retry={retry} />
    </PageFrame>
  );
}
