import { Metadata } from 'next';
import { z } from 'zod';
import {
  fetchOrpcOptional,
  fetchOrpcOrNotFound,
  parseParamsOrNotFound,
} from '@/lib/orpc/server-helpers';
import { orpc } from '@/lib/orpc/orpc';
import { Card, CardContent } from '@/components/ui/card';
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
  const sr = beatmapStats.beatmap.sr;
  const bpm = beatmapStats.beatmap.bpm;
  const mapper =
    beatmapStats.beatmap.creators?.[0]?.username ??
    beatmapStats.beatmap.beatmapset?.creator?.username;
  const beatmapsetOsuId = beatmapStats.beatmap.beatmapset?.osuId;

  const pageTitle = `${artist} - ${title} [${diffName}]`;
  const description = mapper
    ? `${sr.toFixed(2)}★ | ${bpm.toFixed(0)} BPM | Mapped by ${mapper}`
    : `${sr.toFixed(2)}★ | ${bpm.toFixed(0)} BPM`;

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
        images: [
          {
            url: coverImage,
            width: 800,
            height: 200,
            alt: `${artist} - ${title}`,
          },
        ],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      ...(coverImage && {
        images: [coverImage],
      }),
    },
  };
}

export default async function BeatmapPage({ params }: PageProps) {
  const { id } = parseParamsOrNotFound(beatmapPageParamsSchema, await params);
  const beatmapStats = await fetchOrpcOrNotFound(() =>
    orpc.beatmaps.stats({ id })
  );

  const hasData = beatmapStats.tournaments.length > 0;

  return (
    <div className="container mx-auto flex flex-col gap-4 md:gap-2">
      <BeatmapHeader beatmap={beatmapStats.beatmap} />
      {hasData ? (
        <>
          <BeatmapStatsCard summary={beatmapStats.summary} />
          {beatmapStats.usageOverTime.length >= 2 && (
            <BeatmapUsageChart data={beatmapStats.usageOverTime} />
          )}
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 md:gap-2">
            <BeatmapModDistributionChart
              modStats={beatmapStats.modDistribution}
            />
            <BeatmapScoreRatingChart data={beatmapStats.scoreRatingData} />
          </div>
          <BeatmapTournamentsList
            tournaments={beatmapStats.tournaments}
            beatmapOsuId={beatmapStats.beatmap.osuId}
          />
          {beatmapStats.topPerformers.length > 0 && (
            <BeatmapTopPerformersTable
              performers={beatmapStats.topPerformers}
            />
          )}
        </>
      ) : (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <h2 className="text-lg font-semibold">No Tournament Data</h2>
            <p className="text-muted-foreground mt-2 max-w-md text-sm">
              This beatmap has not been used in any verified tournaments yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
