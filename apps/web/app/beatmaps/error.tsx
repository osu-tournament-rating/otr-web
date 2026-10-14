'use client';

import RouteError from '@/components/error/RouteError';

export default function BeatmapsError({ retry }: { retry: () => void }) {
  return (
    <RouteError
      title="Beatmaps could not load"
      description="The beatmap listing is temporarily unavailable."
      retry={retry}
    />
  );
}
