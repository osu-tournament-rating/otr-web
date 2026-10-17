import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { AuditEntityType } from '@otr/core/osu';
import * as schema from '@otr/core/db/schema';
import AuditHistoryPage from '@/components/audit/AuditHistoryPage';
import { getAuditEntityTitle } from '@/components/audit/AuditPageHeader';
import { db } from '@/lib/db';
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
    title: `Audit: ${getAuditEntityTitle(AuditEntityType.Score, parsed.data.id)}`,
  };
}

/**
 * A score opens on its match's page, scrolled to it, as a report's link
 * does. A deleted score has nowhere to go, so the page links back to the
 * audit log.
 */
async function getScoreHref(id: number): Promise<string | null> {
  const score = await db.query.gameScores.findFirst({
    where: eq(schema.gameScores.id, id),
    columns: {},
    with: { game: { columns: { matchId: true } } },
  });
  return score?.game ? `/matches/${score.game.matchId}?scoreId=${id}` : null;
}

export default async function ScoreAuditPage({ params }: PageProps) {
  const { id } = parseParamsOrNotFound(paramsSchema, await params);

  const href = await getScoreHref(id);

  return (
    <AuditHistoryPage
      entityType={AuditEntityType.Score}
      entityId={id}
      back={href ? { href, label: 'View score' } : undefined}
    />
  );
}
