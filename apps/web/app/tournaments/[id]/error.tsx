'use client';

import RouteError from '@/components/error/RouteError';
import { PageFrame } from '@/components/kit/layout/PageFrame';

export default function TournamentError({ retry }: { retry: () => void }) {
  return (
    <PageFrame>
      <RouteError
        title="Tournament could not load"
        back={{ href: '/tournaments', label: 'Tournaments' }}
        retry={retry}
      />
    </PageFrame>
  );
}
