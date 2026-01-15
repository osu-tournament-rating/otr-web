import { Metadata } from 'next';
import { z } from 'zod';

import { ReportEntityType } from '@otr/core/osu';

import EntityAuditPage from '@/components/audits/EntityAuditPage';
import { getMatchCached } from '@/lib/orpc/queries/match';
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
    return { title: 'Match Not Found' };
  }

  const match = await fetchOrpcOptional(() =>
    getMatchCached(parsedParams.data.id)
  );

  if (!match) {
    return { title: 'Match Not Found' };
  }

  return { title: `${match.name} - Audit History` };
}

export default async function MatchAuditsPage({
  params,
}: {
  params: PageParams;
}) {
  const { id } = parseParamsOrNotFound(paramsSchema, await params);

  const match = await fetchOrpcOrNotFound(() => getMatchCached(id));

  const entityState = await orpc.audits.entityState({
    entityType: ReportEntityType.Match,
    referenceIdLock: id,
  });

  return (
    <EntityAuditPage
      entityType={ReportEntityType.Match}
      referenceIdLock={id}
      entityDisplayName={match.name}
      backHref={`/matches/${id}`}
      backLabel="Back to Match"
      entityState={{
        exists: entityState.exists,
        data: entityState.data,
      }}
    />
  );
}
