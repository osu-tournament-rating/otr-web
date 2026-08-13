import { Inbox } from 'lucide-react';
import { Metadata } from 'next';
import { z } from 'zod';

import BeatmapDistributionsCard from '@/components/beatmap/BeatmapDistributionsCard';
import BeatmapHeader from '@/components/beatmap/BeatmapHeader';
import BeatmapLeaderboardCard from '@/components/beatmap/BeatmapLeaderboardCard';
import BeatmapMarginCard from '@/components/beatmap/BeatmapMarginCard';
import BeatmapOverviewCard from '@/components/beatmap/BeatmapOverviewCard';
import BeatmapPerformanceCard from '@/components/beatmap/BeatmapPerformanceCard';
import BeatmapScoreDistributionCard from '@/components/beatmap/BeatmapScoreDistributionCard';
import BeatmapScoreScatterCard from '@/components/beatmap/BeatmapScoreScatterCard';
import { SectionCard } from '@/components/beatmap/BeatmapSection';
import BeatmapTierBreakdownCard from '@/components/beatmap/BeatmapTierBreakdownCard';
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
  const hasNoVerifiedData =
    stats.tournaments.length === 0 && totalVerifiedScoreCount === 0;

  // BeatmapHeader and BeatmapOverviewCard are duplicated in both branches — keep their props in sync.
  if (hasNoVerifiedData) {
    return (
      <div className="container mx-auto space-y-4 px-4 py-6 sm:px-0 sm:py-0">
        <BeatmapHeader
          beatmap={stats.beatmap}
          relatedDifficulties={stats.relatedDifficulties}
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <BeatmapOverviewCard
            beatmap={stats.beatmap}
            usage={stats.usageOverTime}
            summary={stats.summary}
            pools={stats.tournaments}
          />
          <SectionCard
            data-testid="beatmap-empty-band"
            className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center lg:col-span-2"
          >
            <Inbox className="size-8 text-muted-foreground" aria-hidden />
            <p className="font-medium">
              No verified tournament data recorded yet
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              Statistics will appear once a verified tournament uses this
              beatmap.
            </p>
          </SectionCard>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-4 px-4 py-6 sm:px-0 sm:py-0">
      <BeatmapHeader
        beatmap={stats.beatmap}
        relatedDifficulties={stats.relatedDifficulties}
      />

      {/* Both cards stretch to the taller of the two: the distributions card
          centres its charts in the surplus rather than leaving it as a gap
          under the row. */}
      <div className="grid gap-4 lg:grid-cols-3">
        <BeatmapOverviewCard
          beatmap={stats.beatmap}
          usage={stats.usageOverTime}
          summary={stats.summary}
          pools={stats.tournaments}
        />

        <BeatmapDistributionsCard
          className="lg:col-span-2"
          modStats={stats.modDistribution}
          pools={stats.tournaments}
          freemodPicks={stats.freemodPicks}
          rankRangeMods={stats.rankRangeModDistribution}
          gradeDistribution={stats.performance.gradeDistribution}
        />
      </div>

      <BeatmapScoreDistributionCard
        distribution={stats.scoreDistribution}
        percentiles={stats.scorePercentiles}
        totalScoreCount={stats.chartedScoreCount}
      />

      <BeatmapTierBreakdownCard tierBreakdown={stats.tierBreakdown} />

      <BeatmapScoreScatterCard sample={stats.scoreSample} />

      <div className="grid gap-4 lg:grid-cols-2">
        <BeatmapMarginCard closeness={stats.closeness} />
        <BeatmapPerformanceCard performance={stats.performance} />
      </div>

      <BeatmapLeaderboardCard
        performers={stats.topPerformers}
        totalScoreCount={totalVerifiedScoreCount}
      />
    </div>
  );
}
