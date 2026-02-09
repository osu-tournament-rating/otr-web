import type { Metadata } from 'next';
import { z } from 'zod';
import { AuditEntityType } from '@otr/core/osu';
import AuditPageHeader from '@/components/audit/AuditPageHeader';
import AuditEntityTimeline from '@/components/audit/AuditEntityTimeline';
import {
  fetchOrpcOptional,
  parseParamsOrNotFound,
} from '@/lib/orpc/server-helpers';
import { getTournamentCached } from '@/lib/orpc/queries/tournament';

type PageProps = {
  params: Promise<{ id: string }>;
};

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) return { title: 'Audit History' };

  const tournament = await fetchOrpcOptional(() =>
    getTournamentCached(parsed.data.id)
  );

  return {
    title: tournament
      ? `Audit: ${tournament.name}`
      : `Tournament #${parsed.data.id} Audit`,
  };
}

export default async function TournamentAuditPage({ params }: PageProps) {
  const { id } = parseParamsOrNotFound(paramsSchema, await params);

  const tournament = await fetchOrpcOptional(() => getTournamentCached(id));

  return (
    <>
      <AuditPageHeader
        entityType={AuditEntityType.Tournament}
        entityId={id}
        entityName={tournament?.name}
      />
      <AuditEntityTimeline
        entityType={AuditEntityType.Tournament}
        entityId={id}
      />
    </>
  );
}
