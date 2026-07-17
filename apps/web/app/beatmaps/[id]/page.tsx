import { Metadata } from 'next';
import { BarChart3, Gamepad2 } from 'lucide-react';
import { z } from 'zod';

import BeatmapHeader from '@/components/beatmap/BeatmapHeader';
import BeatmapMetadataPanel from '@/components/beatmap/BeatmapMetadataPanel';
import BeatmapModDistributionChart from '@/components/beatmap/BeatmapModDistributionChart';
import BeatmapScoreRatingChart from '@/components/beatmap/BeatmapScoreRatingChart';
import BeatmapStatsCard from '@/components/beatmap/BeatmapStatsCard';
import BeatmapTopPerformersTable from '@/components/beatmap/BeatmapTopPerformersTable';
import BeatmapTournamentsList from '@/components/beatmap/BeatmapTournamentsList';
import BeatmapUsageChart from '@/components/beatmap/BeatmapUsageChart';
import { getBeatmapStatsCached } from '@/lib/orpc/queries/beatmapStats';
import {
  fetchOrpcOptional,
  fetchOrpcOrNotFound,
  parseParamsOrNotFound,
} from '@/lib/orpc/server-helpers';

type PageProps = {
  params: Promise<{ id: string }>;
};

const beatmapPageParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const parsedParams = beatmapPageParamsSchema.safeParse(await params);

  if (!parsedParams.success) return { title: 'Beatmap Not Found' };

  const stats = await fetchOrpcOptional(() =>
    getBeatmapStatsCached(parsedParams.data.id)
  );
  if (!stats) return { title: 'Beatmap Not Found' };

  const artist = stats.beatmap.beatmapset?.artist ?? 'Unknown artist';
  const title = stats.beatmap.beatmapset?.title ?? 'Unknown title';
  const pageTitle = `${artist} - ${title} [${stats.beatmap.diffName}]`;
  const description = `${stats.beatmap.sr.toFixed(2)} SR · ${Math.round(
    stats.beatmap.bpm
  )} BPM`;
  const beatmapsetOsuId = stats.beatmap.beatmapset?.osuId;
  const coverImage = beatmapsetOsuId
    ? `https://assets.ppy.sh/beatmaps/${beatmapsetOsuId}/covers/cover.jpg`
    : undefined;

  return {
    title: pageTitle,
    description,
    openGraph: {
      siteName: 'osu! Tournament Rating',
      title: pageTitle,
      description,
      type: 'website',
      ...(coverImage && {
        images: [{ url: coverImage, width: 800, height: 200, alt: pageTitle }],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      ...(coverImage && { images: [coverImage] }),
    },
  };
}

export default async function BeatmapPage({ params }: PageProps) {
  const { id } = parseParamsOrNotFound(beatmapPageParamsSchema, await params);
  const stats = await fetchOrpcOrNotFound(() => getBeatmapStatsCached(id));

  return (
    <div className="container mx-auto space-y-4 px-4 py-6 sm:px-0 sm:py-0">
      <BeatmapHeader
        beatmap={stats.beatmap}
        relatedDifficulties={stats.relatedDifficulties}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <main className="min-w-0 space-y-4">
          <section className="overflow-hidden rounded-xl border bg-card shadow-sm dark:shadow-none">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <Gamepad2 className="size-4 text-primary" aria-hidden="true" />
              <h2 className="font-semibold">Tournament usage</h2>
            </div>
            <div className="p-3 sm:p-4">
              <BeatmapStatsCard summary={stats.summary} />
            </div>
            {stats.usageOverTime.length >= 2 ? (
              <BeatmapUsageChart
                data={stats.usageOverTime}
                className="rounded-none border-x-0 border-b-0 shadow-none"
              />
            ) : (
              <p className="border-t px-4 py-8 text-center text-sm text-muted-foreground">
                Not enough history for a usage trend.
              </p>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border bg-card shadow-sm dark:shadow-none">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <BarChart3 className="size-4 text-primary" aria-hidden="true" />
              <h2 className="font-semibold">Score vs TR</h2>
            </div>
            <BeatmapScoreRatingChart
              data={stats.scoreRatingData}
              className="rounded-none border-0 shadow-none"
            />
          </section>

          <BeatmapTournamentsList
            tournaments={stats.tournaments}
            beatmapOsuId={stats.beatmap.osuId}
          />

          <BeatmapTopPerformersTable performers={stats.topPerformers} />
        </main>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-20">
          <BeatmapMetadataPanel beatmap={stats.beatmap} />
          <BeatmapModDistributionChart
            modStats={stats.modDistribution}
            className="shadow-sm dark:shadow-none"
          />
        </aside>
      </div>
    </div>
  );
}
