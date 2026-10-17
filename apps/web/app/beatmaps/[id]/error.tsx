'use client';

import RouteError from '@/components/error/RouteError';
import { PageFrame } from '@/components/kit/layout/PageFrame';

export default function BeatmapDetailError({ retry }: { retry: () => void }) {
  return (
    <PageFrame>
      <RouteError
        title="Beatmap could not load"
        back={{ href: '/beatmaps', label: 'Beatmaps' }}
        retry={retry}
      />
    </PageFrame>
  );
}
