import { Metadata } from 'next';
import { z } from 'zod';

import { ReportEntityType } from '@otr/core/osu';

import EntityAuditPage from '@/components/audits/EntityAuditPage';
import { orpc } from '@/lib/orpc/orpc';
import { parseParamsOrNotFound } from '@/lib/orpc/server-helpers';

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
    return { title: 'Game Not Found' };
  }

  const entityState = await orpc.audits.entityState({
    entityType: ReportEntityType.Game,
    referenceIdLock: parsedParams.data.id,
  });

  return { title: `${entityState.entityDisplayName} - Audit History` };
}

export default async function GameAuditsPage({
  params,
}: {
  params: PageParams;
}) {
  const { id } = parseParamsOrNotFound(paramsSchema, await params);

  const entityState = await orpc.audits.entityState({
    entityType: ReportEntityType.Game,
    referenceIdLock: id,
  });

  const gameData = entityState.data as { matchId?: number } | null;
  const backHref = gameData?.matchId
    ? `/matches/${gameData.matchId}`
    : '/audits';
  const backLabel = gameData?.matchId ? 'Back to Match' : 'Back to Audit Logs';

  return (
    <EntityAuditPage
      entityType={ReportEntityType.Game}
      referenceIdLock={id}
      entityDisplayName={entityState.entityDisplayName}
      backHref={backHref}
      backLabel={backLabel}
      entityState={{
        exists: entityState.exists,
        data: entityState.data,
      }}
    />
  );
}
