'use client';

import RouteError from '@/components/error/RouteError';

export default function BeatmapDetailError({ retry }: { retry: () => void }) {
  return (
    <RouteError
      title="Beatmap could not load"
      back={{ href: '/beatmaps', label: 'Beatmaps' }}
      retry={retry}
    />
  );
}
