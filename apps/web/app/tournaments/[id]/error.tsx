'use client';

import RouteError from '@/components/error/RouteError';

export default function TournamentError({ retry }: { retry: () => void }) {
  return (
    <RouteError
      title="Tournament could not load"
      back={{ href: '/tournaments', label: 'Tournaments' }}
      retry={retry}
    />
  );
}
