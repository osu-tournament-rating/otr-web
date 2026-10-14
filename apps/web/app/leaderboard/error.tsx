'use client';

import RouteError from '@/components/error/RouteError';

export default function LeaderboardError({ retry }: { retry: () => void }) {
  return <RouteError title="Leaderboard could not load" retry={retry} />;
}
