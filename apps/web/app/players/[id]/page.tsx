import PlayerBeatmapsList from '@/components/player/PlayerBeatmapsList';
import PlayerCard from '@/components/player/PlayerCard';
import PlayerModCountChart from '@/components/player/PlayerModCountChart';
import PlayerModStatsChart from '@/components/player/PlayerModStatsChart';
import PlayerOpponentsChart from '@/components/player/PlayerOpponentsChart';
import PlayerRatingChart from '@/components/player/PlayerRatingChart';
import PlayerRatingStatsCard from '@/components/player/PlayerRatingStatsCard';
import PlayerTeammatesChart from '@/components/player/PlayerTeammatesChart';
import PlayerTournamentsList from '@/components/player/PlayerTournamentsList';
import { Card } from '@/components/ui/card';
import { getPlayerBeatmapsCached } from '@/lib/orpc/queries/playerBeatmaps';
import { getPlayerDashboardStatsCached } from '@/lib/orpc/queries/playerDashboard';
import { getPlayerTournamentsCached } from '@/lib/orpc/queries/playerTournaments';
import type { PlayerDashboardStats } from '@/lib/orpc/schema/playerDashboard';
import { TournamentListItem } from '@/lib/orpc/schema/tournament';
import { Ruleset } from '@otr/core/osu';
import { MOD_CHART_DISPLAY_THRESHOLD } from '@/lib/utils/playerModCharts';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PlayerBeatmapsResponse } from '@/lib/orpc/schema/playerBeatmaps';
import { resolvePlayerIdFromKey } from '@/lib/db/player-resolve';

const INITIAL_BEATMAPS_LIMIT = 3;

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
): Promise<PlayerDashboardStats | undefined> {
  const decodedKey = decodeURIComponent(key);
  const playerId = (await resolvePlayerIdFromKey(decodedKey)) ?? 0;

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
    return await getPlayerDashboardStatsCached(
      playerId,
      dateMin,
      dateMax,
      ruleset
    );
  } catch (error) {
    console.error('Failed to fetch player data:', error);
    return undefined;
  }
}

async function getTournaments(
  key: string,
  searchParams: { [key: string]: string | string[] | undefined }
): Promise<TournamentListItem[]> {
  const decodedKey = decodeURIComponent(key);
  const playerId = (await resolvePlayerIdFromKey(decodedKey)) ?? 0;

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
    return await getPlayerTournamentsCached(
      playerId,
      dateMin,
      dateMax,
      ruleset
    );
  } catch (error) {
    console.error('Failed to fetch player tournaments:', error);
    return [];
  }
}

async function getBeatmaps(
  playerId: number,
  ruleset?: Ruleset
): Promise<PlayerBeatmapsResponse> {
  if (!playerId || playerId <= 0) {
    return {
      beatmaps: [],
      totalCount: 0,
    };
  }

  try {
    return await getPlayerBeatmapsCached(
      playerId,
      ruleset,
      INITIAL_BEATMAPS_LIMIT,
      0
    );
  } catch (error) {
    console.error('Failed to fetch player beatmaps:', error);
    return {
      beatmaps: [],
      totalCount: 0,
    };
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

  const canonicalPlayerId = playerData.playerInfo.id;

  // Get the current ruleset from search params or default to Osu
  const currentRuleset = searchParams.ruleset
    ? (Number(searchParams.ruleset) as Ruleset)
    : Ruleset.Osu;

  // Get the list of tournaments that the player has participated in
  const playerTournaments = await getTournaments(decodedId, {
    ...searchParams,
    ruleset: currentRuleset.toString(),
  });

  // Redirect to o!TR ID if the current URL uses a different search key
  if (canonicalPlayerId && canonicalPlayerId.toString() !== decodedId) {
    // Build query string from search params
    const queryString = new URLSearchParams(
      Object.entries(searchParams).reduce(
        (acc, [key, value]) => {
          if (value !== undefined) {
            acc[key] = Array.isArray(value) ? value[0] : value;
          }
          return acc;
        },
        {} as Record<string, string>
      )
    ).toString();

    const redirectUrl = `/players/${playerData.playerInfo.id}${
      queryString ? `?${queryString}` : ''
    }`;

    redirect(redirectUrl);
  }

  // Get the list of tournament beatmaps the player has mapped
  const playerBeatmapsResponse = await getBeatmaps(
    canonicalPlayerId ?? 0,
    currentRuleset
  );

  const modStatsData = playerData.modStats?.filter(
    (stat) =>
      stat.count >=
      ((playerData.modStats?.reduce((sum, stat) => sum + stat.count, 0) ?? 0) *
        MOD_CHART_DISPLAY_THRESHOLD) /
        100.0
  );

  const chartHighestRating = playerData.rating?.adjustments?.length
    ? playerData.rating.adjustments.reduce(
        (max, adjustment) => Math.max(max, adjustment.ratingAfter),
        playerData.rating.adjustments[0].ratingAfter
      )
    : (playerData.matchStats?.highestRating ?? undefined);

  return (
    <div className="container mx-auto flex flex-col gap-4 md:gap-2">
      {/* Render the PlayerRatingCard with the fetched rating data or placeholder */}
      {!playerData.rating && (
        <Card className="p-6 font-sans">
          <PlayerCard
            player={playerData.playerInfo}
            ruleset={playerData.ruleset}
          />
          <Card className="gap-2 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold">No Rating Data Available</h2>
            <p className="text-muted-foreground">
              This player has no rating data for the selected ruleset.
            </p>
          </Card>
        </Card>
      )}

      {/* Show rating data and charts if available */}
      {playerData.rating && playerData.rating.adjustments && (
        <>
          <PlayerRatingStatsCard
            rating={playerData.rating}
            currentRuleset={currentRuleset}
          />
          <PlayerRatingChart
            adjustments={playerData.rating.adjustments}
            highestRating={chartHighestRating ?? undefined}
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
      )}

      {/* Tournament history */}
      <PlayerTournamentsList
        tournaments={playerTournaments}
        adjustments={playerData.rating?.adjustments ?? []}
      />

      {/* Pooled beatmaps */}
      <PlayerBeatmapsList
        playerId={canonicalPlayerId}
        ruleset={currentRuleset}
        initialBeatmaps={playerBeatmapsResponse.beatmaps}
        totalCount={playerBeatmapsResponse.totalCount}
      />
    </div>
  );
}
