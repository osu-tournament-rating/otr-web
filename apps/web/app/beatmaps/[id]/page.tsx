import { Metadata } from 'next';
import { VerificationStatus } from '@otr/core/osu';
import { z } from 'zod';

import BeatmapHeader from '@/components/beatmap/BeatmapHeader';
import BeatmapModDistributionChart from '@/components/beatmap/BeatmapModDistributionChart';
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
  const verifiedPoolCount = stats.tournaments.filter(
    ({ tournament }) =>
      tournament.verificationStatus === VerificationStatus.Verified
  ).length;
  const totalVerifiedScoreCount = stats.modDistribution.reduce(
    (total, distribution) => total + distribution.scoreCount,
    0
  );

  return (
    <div className="container mx-auto space-y-4 px-4 py-6 sm:px-0 sm:py-0">
      <BeatmapHeader
        beatmap={stats.beatmap}
        relatedDifficulties={stats.relatedDifficulties}
        summary={stats.summary}
        verifiedPoolCount={verifiedPoolCount}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <BeatmapUsageChart
          data={stats.usageOverTime}
          className="shadow-sm dark:shadow-none"
        />
        <BeatmapModDistributionChart
          modStats={stats.modDistribution}
          className="shadow-sm dark:shadow-none"
        />
      </div>

      <BeatmapTournamentsList
        tournaments={stats.tournaments}
        beatmapOsuId={stats.beatmap.osuId}
      />

      <BeatmapTopPerformersTable
        performers={stats.topPerformers}
        ruleset={stats.beatmap.ruleset}
        totalScoreCount={totalVerifiedScoreCount}
      />
    </div>
  );
}
