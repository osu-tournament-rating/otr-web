'use client';

import RouteError from '@/components/error/RouteError';

export default function PlayerError({ retry }: { retry: () => void }) {
  return (
    <RouteError
      title="Player could not load"
      back={{ href: '/leaderboard', label: 'Leaderboard' }}
      retry={retry}
    />
  );
}
