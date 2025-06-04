import PlayerCard from '@/components/player/PlayerCard';
import PlayerModCountChart from '@/components/player/PlayerModCountChart';
import PlayerModStatsChart from '@/components/player/PlayerModStatsChart';
import PlayerRatingChart from '@/components/player/PlayerRatingChart';
import PlayerRatingStatsCard from '@/components/player/PlayerRatingStatsCard';
import { Card } from '@/components/ui/card';
import { getStatsCached } from '@/lib/actions/players';
import {
  PlayerDashboardStatsDTO,
  Ruleset,
} from '@osu-tournament-rating/otr-api-client';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string }>; // Player search key from path
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const playerData = await getPlayerData(id, {});

  if (!playerData) {
    return {
      title: 'Player Not Found',
    };
  }

  return {
    title: playerData.playerInfo.username,
  };
}

async function getPlayerData(
  key: string,
  searchParams: { [key: string]: string | string[] | undefined }
): Promise<PlayerDashboardStatsDTO | undefined> {
  const dateMin = searchParams.dateMin
    ? new Date(searchParams.dateMin as string)
    : undefined;
  const dateMax = searchParams.dateMax
    ? new Date(searchParams.dateMax as string)
    : undefined;

  const ruleset = searchParams.ruleset
    ? (Number(searchParams.ruleset) as Ruleset)
    : undefined;

  try {
    const result = await getStatsCached(key, dateMin, dateMax, ruleset);
    return result;
  } catch (error) {
    console.error('Failed to fetch player data:', error);
    return undefined;
  }
}

export default async function PlayerPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const playerData = await getPlayerData(params.id, searchParams);

  // Handle case where player data might not be found
  if (!playerData) {
    return notFound();
  }

  // Get the current ruleset from search params or default to Osu
  const currentRuleset = searchParams.ruleset
    ? (Number(searchParams.ruleset) as Ruleset)
    : Ruleset.Osu;

  const modSum =
    playerData.modStats?.reduce((sum, current) => sum + current.count, 0) ?? 0;

  return (
    <div className="container mx-auto flex flex-col gap-4 p-4 py-10 md:gap-2">
      {/* Render the PlayerRatingCard with the fetched rating data or placeholder */}
      {playerData.rating && playerData.rating.adjustments ? (
        <>
          <PlayerRatingStatsCard
            rating={playerData.rating}
            currentRuleset={currentRuleset}
          />
          <PlayerRatingChart
            adjustments={playerData.rating.adjustments}
            highestRating={
              playerData.matchStats?.highestRating ||
              playerData.rating.adjustments.sort(
                (a, b) => b.ratingAfter - a.ratingAfter
              )[0].ratingAfter
            }
          />
          {/* Display mod statistics if available */}
          {playerData.modStats && modSum >= 10 && (
            <div className="flex flex-col gap-4 md:flex-row md:gap-2">
              <PlayerModStatsChart
                className="w-full md:w-80 md:flex-none lg:flex-1"
                modStats={playerData.modStats}
              />
              <PlayerModCountChart
                className="w-full md:flex-1"
                modStats={playerData.modStats}
              />
            </div>
          )}
        </>
      ) : (
        // No ruleset data
        <Card className="p-6 font-sans">
          <PlayerCard
            player={playerData.playerInfo}
            provisional={playerData.rating?.isProvisional ?? false}
          />
          <Card className="gap-2 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold">No Data Available</h2>
            <p className="text-muted-foreground">
              This player has no rating data for the selected ruleset.
            </p>
          </Card>
        </Card>
      )}
    </div>
  );
}
