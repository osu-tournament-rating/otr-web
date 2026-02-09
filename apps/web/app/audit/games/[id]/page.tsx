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

  return { title: `Game #${parsed.data.id} Audit` };
}

export default async function GameAuditPage({ params }: PageProps) {
  const { id } = parseParamsOrNotFound(paramsSchema, await params);

  return (
    <>
      <AuditPageHeader
        entityType={AuditEntityType.Game}
        entityId={id}
      />
      <AuditEntityTimeline
        entityType={AuditEntityType.Game}
        entityId={id}
      />
    </>
  );
}
