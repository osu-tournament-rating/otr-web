'use client';

import RouteError from '@/components/error/RouteError';
import { PageFrame } from '@/components/kit/layout/PageFrame';

export default function MatchError({ retry }: { retry: () => void }) {
  return (
    <PageFrame>
      <RouteError
        title="Match could not load"
        back={{ href: '/tournaments', label: 'Tournaments' }}
        retry={retry}
      />
    </PageFrame>
  );
}
