import { Metadata } from 'next';
import { z } from 'zod';

import BeatmapActivityCard from '@/components/beatmap/BeatmapActivityCard';
import BeatmapAttributesCard from '@/components/beatmap/BeatmapAttributesCard';
import BeatmapHeader from '@/components/beatmap/BeatmapHeader';
import BeatmapModDistributionChart from '@/components/beatmap/BeatmapModDistributionChart';
import BeatmapRecordsCard from '@/components/beatmap/BeatmapRecordsCard';
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
  const totalVerifiedScoreCount = stats.modDistribution.reduce(
    (total, distribution) => total + distribution.scoreCount,
    0
  );

  return (
    <div className="container mx-auto space-y-4 px-4 py-6 sm:px-0 sm:py-0">
      <BeatmapHeader
        beatmap={stats.beatmap}
        relatedDifficulties={stats.relatedDifficulties}
      />

      <BeatmapModDistributionChart
        modStats={stats.modDistribution}
        className="shadow-sm dark:shadow-none"
      />

      <div className="grid items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="space-y-4 lg:sticky lg:top-20">
          <BeatmapAttributesCard beatmap={stats.beatmap} />
          <BeatmapActivityCard
            data={stats.usageOverTime}
            summary={stats.summary}
            pools={stats.tournaments}
          />
        </div>

        <BeatmapRecordsCard
          pools={stats.tournaments}
          performers={stats.topPerformers}
          beatmapOsuId={stats.beatmap.osuId}
          totalScoreCount={totalVerifiedScoreCount}
        />
      </div>
    </div>
  );
}
