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
import BeatmapTierBreakdownCard from '@/components/beatmap/BeatmapTierBreakdownCard';
import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { Panel } from '@/components/kit/layout/Panel';
import { getBeatmapArtist, getBeatmapTitle } from '@/lib/beatmaps/presentation';
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

  if (!parsedParams.success) return { title: 'Beatmap not found' };

  const stats = await fetchOrpcOptional(() =>
    getBeatmapStatsCached(parsedParams.data.id)
  );
  if (!stats) return { title: 'Beatmap not found' };

  const artist = getBeatmapArtist(stats.beatmap) ?? 'Unknown artist';
  const title = getBeatmapTitle(stats.beatmap) ?? 'Unknown title';
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

  // BeatmapHeader and BeatmapOverviewCard render in both branches; keep their props in sync
  if (hasNoVerifiedData) {
    return (
      <PageFrame>
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
          <Panel className="flex flex-col justify-center lg:col-span-2">
            <EmptyState
              data-testid="beatmap-empty-band"
              icon={Inbox}
              title="No verified tournament data recorded yet"
              description="Statistics will appear once a verified tournament uses this beatmap."
            />
          </Panel>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
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
    </PageFrame>
  );
}
