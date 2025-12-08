import { cache } from 'react';

import { orpc } from '@/lib/orpc/orpc';

export const getTournamentCached = cache(async (id: number) =>
  orpc.tournaments.get({ id })
);
