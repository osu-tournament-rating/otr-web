import type { Metadata } from 'next';
import { z } from 'zod';
import { AuditEntityType } from '@otr/core/osu';
import AuditPageHeader from '@/components/audit/AuditPageHeader';
import AuditEntityTimeline from '@/components/audit/AuditEntityTimeline';
import { fetchOrpcOptional, parseParamsOrNotFound } from '@/lib/orpc/server-helpers';
import { getMatchCached } from '@/lib/orpc/queries/match';

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

  const match = await fetchOrpcOptional(() =>
    getMatchCached(parsed.data.id)
  );

  return {
    title: match
      ? `Audit: ${match.name}`
      : `Match #${parsed.data.id} Audit`,
  };
}

export default async function MatchAuditPage({ params }: PageProps) {
  const { id } = parseParamsOrNotFound(paramsSchema, await params);

  const match = await fetchOrpcOptional(() => getMatchCached(id));

  return (
    <>
      <AuditPageHeader
        entityType={AuditEntityType.Match}
        entityId={id}
        entityName={match?.name}
      />
      <AuditEntityTimeline
        entityType={AuditEntityType.Match}
        entityId={id}
      />
    </>
  );
}
