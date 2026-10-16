import type { Metadata } from 'next';
import { z } from 'zod';
import { AuditEntityType } from '@otr/core/osu';
import AuditHistoryPage from '@/components/audit/AuditHistoryPage';
import { getAuditEntityTitle } from '@/components/audit/AuditPageHeader';
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
  if (!parsed.success) return { title: 'Audit history' };

  const tournament = await fetchOrpcOptional(() =>
    getTournamentCached(parsed.data.id)
  );

  return {
    title: `Audit: ${getAuditEntityTitle(AuditEntityType.Tournament, parsed.data.id, tournament?.name)}`,
  };
}

export default async function TournamentAuditPage({ params }: PageProps) {
  const { id } = parseParamsOrNotFound(paramsSchema, await params);

  const tournament = await fetchOrpcOptional(() => getTournamentCached(id));

  return (
    <AuditHistoryPage
      entityType={AuditEntityType.Tournament}
      entityId={id}
      entityName={tournament?.name}
    />
  );
}
