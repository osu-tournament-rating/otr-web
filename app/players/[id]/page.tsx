import PlayerCard from '@/components/player/PlayerCard';
import PlayerModCountChart from '@/components/player/PlayerModCountChart';
import PlayerModStatsChart from '@/components/player/PlayerModStatsChart';
import PlayerOpponentsChart from '@/components/player/PlayerOpponentsChart';
import PlayerRatingChart from '@/components/player/PlayerRatingChart';
import PlayerRatingStatsCard from '@/components/player/PlayerRatingStatsCard';
import PlayerTeammatesChart from '@/components/player/PlayerTeammatesChart';
import { Card } from '@/components/ui/card';
import { getStatsCached } from '@/lib/actions/players';
import { MOD_CHART_DISPLAY_THRESHOLD } from '@/lib/utils/playerModCharts';
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
  const decodedId = decodeURIComponent(id);
  const playerData = await getPlayerData(decodedId, {});

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
  const decodedKey = decodeURIComponent(key);

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
    const result = await getStatsCached(decodedKey, dateMin, dateMax, ruleset);
    return result;
  } catch (error) {
    console.error('Failed to fetch player data:', error);
    return undefined;
  }
}

export default async function PlayerPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const decodedId = decodeURIComponent(params.id);
  const playerData = await getPlayerData(decodedId, searchParams);

  // Handle case where player data might not be found
  if (!playerData) {
    return notFound();
  }

  // Get the current ruleset from search params or default to Osu
  const currentRuleset = searchParams.ruleset
    ? (Number(searchParams.ruleset) as Ruleset)
    : Ruleset.Osu;

  const modStatsData = playerData.modStats?.filter(
    (stat) =>
      stat.count >=
      ((playerData.modStats?.reduce((sum, stat) => sum + stat.count, 0) ?? 0) *
        MOD_CHART_DISPLAY_THRESHOLD) /
        100.0
  );

  return (
    <div className="container mx-auto flex flex-col gap-4 md:gap-2">
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
              playerData.matchStats?.highestRating &&
              playerData.rating.adjustments.sort(
                (a, b) => b.ratingAfter - a.ratingAfter
              )[0].ratingAfter
            }
          />
          {/* Display all statistics charts in a responsive grid */}
          {(modStatsData ||
            playerData.frequentTeammates ||
            playerData.frequentOpponents) && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-2">
              {modStatsData && (
                <>
                  <PlayerModStatsChart
                    className="w-full"
                    modStats={modStatsData}
                  />
                  <PlayerModCountChart
                    className="w-full"
                    modStats={modStatsData}
                  />
                </>
              )}
              {playerData.frequentTeammates && (
                <PlayerTeammatesChart
                  className="w-full"
                  teammates={playerData.frequentTeammates}
                />
              )}
              {playerData.frequentOpponents && (
                <PlayerOpponentsChart
                  className="w-full"
                  opponents={playerData.frequentOpponents}
                />
              )}
            </div>
          )}
        </>
      ) : (
        // No ruleset data
        <Card className="p-6 font-sans">
          <PlayerCard
            player={playerData.playerInfo}
            ruleset={playerData.ruleset}
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
