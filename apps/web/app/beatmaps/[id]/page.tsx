import { Metadata } from 'next';
import { z } from 'zod';
import {
  fetchOrpcOptional,
  fetchOrpcOrNotFound,
  parseParamsOrNotFound,
} from '@/lib/orpc/server-helpers';
import { orpc } from '@/lib/orpc/orpc';
import BeatmapHeader from '@/components/beatmap/BeatmapHeader';
import BeatmapStatsCard from '@/components/beatmap/BeatmapStatsCard';
import BeatmapUsageChart from '@/components/beatmap/BeatmapUsageChart';
import BeatmapModDistributionChart from '@/components/beatmap/BeatmapModDistributionChart';
import BeatmapScoreRatingChart from '@/components/beatmap/BeatmapScoreRatingChart';
import BeatmapTournamentsList from '@/components/beatmap/BeatmapTournamentsList';
import BeatmapTopPerformersTable from '@/components/beatmap/BeatmapTopPerformersTable';

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

  if (!parsedParams.success) {
    return {
      title: 'Beatmap Not Found',
    };
  }

  const beatmapStats = await fetchOrpcOptional(() =>
    orpc.beatmaps.stats({ id: parsedParams.data.id })
  );

  if (!beatmapStats) {
    return {
      title: 'Beatmap Not Found',
    };
  }

  const artist = beatmapStats.beatmap.beatmapset?.artist ?? 'Unknown';
  const title = beatmapStats.beatmap.beatmapset?.title ?? 'Unknown';
  const diffName = beatmapStats.beatmap.diffName;

  return {
    title: `${artist} - ${title} [${diffName}]`,
  };
}

export default async function BeatmapPage({ params }: PageProps) {
  const { id } = parseParamsOrNotFound(beatmapPageParamsSchema, await params);
  const beatmapStats = await fetchOrpcOrNotFound(() =>
    orpc.beatmaps.stats({ id })
  );

  return (
    <div className="container mx-auto flex flex-col gap-4 md:gap-2">
      <BeatmapHeader beatmap={beatmapStats.beatmap} />
      <BeatmapStatsCard summary={beatmapStats.summary} />
      {beatmapStats.usageOverTime.length >= 2 && (
        <BeatmapUsageChart data={beatmapStats.usageOverTime} />
      )}
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 md:gap-2">
        <BeatmapModDistributionChart modStats={beatmapStats.modDistribution} />
        <BeatmapScoreRatingChart data={beatmapStats.scoreRatingData} />
      </div>
      <BeatmapTournamentsList tournaments={beatmapStats.tournaments} />
      {beatmapStats.topPerformers.length > 0 && (
        <BeatmapTopPerformersTable performers={beatmapStats.topPerformers} />
      )}
    </div>
  );
}
