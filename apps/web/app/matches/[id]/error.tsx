'use client';

import RouteError from '@/components/error/RouteError';

export default function MatchError({ retry }: { retry: () => void }) {
  return (
    <RouteError
      title="Match could not load"
      back={{ href: '/tournaments', label: 'Tournaments' }}
      retry={retry}
    />
  );
}
