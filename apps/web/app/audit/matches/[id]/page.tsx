import type { Metadata } from 'next';
import { z } from 'zod';
import { AuditEntityType } from '@otr/core/osu';
import AuditPageHeader from '@/components/audit/AuditPageHeader';
import AuditEntityView from '@/components/audit/AuditEntityView';
import {
  fetchOrpcOptional,
  parseParamsOrNotFound,
} from '@/lib/orpc/server-helpers';
import { getMatchCached } from '@/lib/orpc/queries/match';
import { getAuditEntityNameCached } from '@/lib/orpc/queries/audit';

type PageProps = {
  params: Promise<{ id: string }>;
};

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/** A deleted match is only named by its deletion audit. */
async function getMatchName(id: number): Promise<string | null> {
  const match = await fetchOrpcOptional(() => getMatchCached(id));
  if (match) return match.name;

  const deleted = await getAuditEntityNameCached(AuditEntityType.Match, id);
  return deleted.entityName;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) return { title: 'Audit History' };

  const name = await getMatchName(parsed.data.id);

  return {
    title: name ? `Audit: ${name}` : `Match #${parsed.data.id} Audit`,
  };
}

export default async function MatchAuditPage({ params }: PageProps) {
  const { id } = parseParamsOrNotFound(paramsSchema, await params);

  const name = await getMatchName(id);

  return (
    <>
      <AuditPageHeader
        entityType={AuditEntityType.Match}
        entityId={id}
        entityName={name ?? undefined}
      />
      <AuditEntityView entityType={AuditEntityType.Match} entityId={id} />
    </>
  );
}
