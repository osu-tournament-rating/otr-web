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
    title: `Audit: ${getAuditEntityTitle(AuditEntityType.Game, parsed.data.id)}`,
  };
}

/**
 * A game opens on its match's page, scrolled to it, as a report's link
 * does. A deleted game has nowhere to go, so the page links back to the
 * audit log.
 */
async function getGameHref(id: number): Promise<string | null> {
  const game = await db.query.games.findFirst({
    where: eq(schema.games.id, id),
    columns: { matchId: true },
  });
  return game ? `/matches/${game.matchId}?gameId=${id}` : null;
}

export default async function GameAuditPage({ params }: PageProps) {
  const { id } = parseParamsOrNotFound(paramsSchema, await params);

  const href = await getGameHref(id);

  return (
    <AuditHistoryPage
      entityType={AuditEntityType.Game}
      entityId={id}
      back={href ? { href, label: 'View game' } : undefined}
    />
  );
}
