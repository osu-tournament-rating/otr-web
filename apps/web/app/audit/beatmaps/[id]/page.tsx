import type { Metadata } from 'next';
import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { AuditEntityType } from '@otr/core/osu';
import * as schema from '@otr/core/db/schema';
import AuditHistoryPage from '@/components/audit/AuditHistoryPage';
import { getAuditEntityTitle } from '@/components/audit/AuditPageHeader';
import { getBeatmapArtist, getBeatmapTitle } from '@/lib/beatmaps/presentation';
import { db } from '@/lib/db';
import { parseParamsOrNotFound } from '@/lib/orpc/server-helpers';

type PageProps = {
  params: Promise<{ id: string }>;
};

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/**
 * The beatmap behind an audit ID. Its page lives at its osu! ID, and its
 * name reads as on that page: "Artist - Title [Difficulty]". A beatmap the
 * site no longer has keeps the "Beatmap #162" title and links back to the
 * audit log.
 */
const getAuditedBeatmap = cache(async (id: number) => {
  const beatmap = await db.query.beatmaps.findFirst({
    where: eq(schema.beatmaps.id, id),
    columns: {
      osuId: true,
      diffName: true,
      artistOverride: true,
      titleOverride: true,
    },
    with: { beatmapset: { columns: { artist: true, title: true } } },
  });
  if (!beatmap) return null;

  const artist = getBeatmapArtist(beatmap) ?? 'Unknown artist';
  const title = getBeatmapTitle(beatmap) ?? 'Unknown title';
  return {
    name: `${artist} - ${title} [${beatmap.diffName}]`,
    href: `/beatmaps/${beatmap.osuId}`,
  };
});

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) return { title: 'Audit history' };

  const beatmap = await getAuditedBeatmap(parsed.data.id);

  return {
    title: `Audit: ${getAuditEntityTitle(AuditEntityType.Beatmap, parsed.data.id, beatmap?.name)}`,
  };
}

export default async function BeatmapAuditPage({ params }: PageProps) {
  const { id } = parseParamsOrNotFound(paramsSchema, await params);

  const beatmap = await getAuditedBeatmap(id);

  return (
    <AuditHistoryPage
      entityType={AuditEntityType.Beatmap}
      entityId={id}
      entityName={beatmap?.name}
      back={beatmap ? { href: beatmap.href, label: 'View beatmap' } : undefined}
    />
  );
}
