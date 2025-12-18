import { cache } from 'react';

import { orpc } from '@/lib/orpc/orpc';

export const getBeatmapStatsCached = cache(async (id: number) =>
  orpc.beatmaps.stats({ id, keyType: 'osu' })
);
