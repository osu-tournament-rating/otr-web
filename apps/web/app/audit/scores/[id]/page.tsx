import type { Metadata } from 'next';
import { z } from 'zod';
import { AuditEntityType } from '@otr/core/osu';
import AuditPageHeader from '@/components/audit/AuditPageHeader';
import AuditEntityTimeline from '@/components/audit/AuditEntityTimeline';
import { parseParamsOrNotFound } from '@/lib/orpc/server-helpers';

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

  return { title: `Score #${parsed.data.id} Audit` };
}

export default async function ScoreAuditPage({ params }: PageProps) {
  const { id } = parseParamsOrNotFound(paramsSchema, await params);

  return (
    <>
      <AuditPageHeader
        entityType={AuditEntityType.Score}
        entityId={id}
      />
      <AuditEntityTimeline
        entityType={AuditEntityType.Score}
        entityId={id}
      />
    </>
  );
}
