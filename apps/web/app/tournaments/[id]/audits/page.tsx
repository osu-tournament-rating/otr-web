import { Metadata } from 'next';
import { z } from 'zod';

import { ReportEntityType } from '@otr/core/osu';

import EntityAuditPage from '@/components/audits/EntityAuditPage';
import { getTournamentCached } from '@/lib/orpc/queries/tournament';
import { orpc } from '@/lib/orpc/orpc';
import {
  fetchOrpcOptional,
  fetchOrpcOrNotFound,
  parseParamsOrNotFound,
} from '@/lib/orpc/server-helpers';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

type PageParams = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const parsedParams = paramsSchema.safeParse(await params);

  if (!parsedParams.success) {
    return { title: 'Tournament Not Found' };
  }

  const tournament = await fetchOrpcOptional(() =>
    getTournamentCached(parsedParams.data.id)
  );

  if (!tournament) {
    return { title: 'Tournament Not Found' };
  }

  return { title: `${tournament.name} - Audit History` };
}

export default async function TournamentAuditsPage({
  params,
}: {
  params: PageParams;
}) {
  const { id } = parseParamsOrNotFound(paramsSchema, await params);

  const tournament = await fetchOrpcOrNotFound(() => getTournamentCached(id));

  const entityState = await orpc.audits.entityState({
    entityType: ReportEntityType.Tournament,
    referenceIdLock: id,
  });

  return (
    <EntityAuditPage
      entityType={ReportEntityType.Tournament}
      referenceIdLock={id}
      entityDisplayName={tournament.name}
      backHref={`/tournaments/${id}`}
      backLabel="Back to Tournament"
      entityState={{
        exists: entityState.exists,
        data: entityState.data,
      }}
    />
  );
}
