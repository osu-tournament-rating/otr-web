'use client';

import RouteError from '@/components/error/RouteError';
import { PageFrame } from '@/components/kit/layout/PageFrame';

export default function BeatmapsError({ retry }: { retry: () => void }) {
  return (
    <PageFrame>
      <RouteError
        title="Beatmaps could not load"
        description="The beatmap listing is temporarily unavailable."
        retry={retry}
      />
    </PageFrame>
  );
}
