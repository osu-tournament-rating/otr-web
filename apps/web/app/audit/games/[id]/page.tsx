import type { Metadata } from 'next';
import { z } from 'zod';
import { AuditEntityType } from '@otr/core/osu';
import AuditHistoryPage from '@/components/audit/AuditHistoryPage';
import { getAuditEntityTitle } from '@/components/audit/AuditPageHeader';
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
  if (!parsed.success) return { title: 'Audit history' };

  return {
    title: `Audit: ${getAuditEntityTitle(AuditEntityType.Game, parsed.data.id)}`,
  };
}

export default async function GameAuditPage({ params }: PageProps) {
  const { id } = parseParamsOrNotFound(paramsSchema, await params);

  return <AuditHistoryPage entityType={AuditEntityType.Game} entityId={id} />;
}
