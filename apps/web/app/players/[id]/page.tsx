import SectionErrorBoundary from '@/components/error/SectionErrorBoundary';
import PlayerBeatmapsList from '@/components/player/PlayerBeatmapsList';
import PlayerCard from '@/components/player/PlayerCard';
import PlayerModCountChart from '@/components/player/PlayerModCountChart';
import PlayerModStatsChart from '@/components/player/PlayerModStatsChart';
import PlayerOpponentsChart from '@/components/player/PlayerOpponentsChart';
import PlayerRatingChart from '@/components/player/PlayerRatingChart';
import PlayerRatingStatsCard from '@/components/player/PlayerRatingStatsCard';
import {
  PlayerBeatmapsSkeleton,
  PlayerTournamentsSkeleton,
} from '@/components/player/PlayerSectionSkeletons';
import PlayerTeammatesChart from '@/components/player/PlayerTeammatesChart';
import PlayerTournamentsList from '@/components/player/PlayerTournamentsList';
import { Card } from '@/components/ui/card';
import { getPlayerBeatmapsCached } from '@/lib/orpc/queries/playerBeatmaps';
import { getPlayerStatsCached } from '@/lib/orpc/queries/playerStats';
import { getPlayerTournamentsCached } from '@/lib/orpc/queries/playerTournaments';
import type {
  PlayerRatingAdjustment,
  PlayerStats,
} from '@/lib/orpc/schema/playerStats';
import { Ruleset } from '@otr/core/osu';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { resolvePlayerIdFromKey } from '@/lib/db/player-resolve';
import { z } from 'zod';
import {
  fetchOrpcOptional,
  parseParamsOrNotFound,
} from '@/lib/orpc/server-helpers';

const INITIAL_BEATMAPS_LIMIT = 3;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const playerPageParamsSchema = z.object({
  id: z.string().min(1),
});

// Junk filter params fall back to the defaults instead of failing the page.
const playerPageFilterSchema = z.object({
  ruleset: z.coerce.number().pipe(z.enum(Ruleset)).optional().catch(undefined),
  dateMin: z.coerce.date().optional().catch(undefined),
  dateMax: z.coerce.date().optional().catch(undefined),
});

type PlayerPageFilter = z.infer<typeof playerPageFilterSchema>;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const parsedParams = playerPageParamsSchema.safeParse(await params);

  if (!parsedParams.success) {
    return {
      title: 'Player Not Found',
    };
  }

  const decodedId = decodeURIComponent(parsedParams.data.id);
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

/**
 * Resolves undefined only when the player does not exist. Every other failure
 * throws, so it reaches the error screen rather than the not-found page.
 */
async function getPlayerData(
  key: string,
  filter: PlayerPageFilter
): Promise<PlayerStats | undefined> {
  const decodedKey = decodeURIComponent(key);
  const playerId = (await resolvePlayerIdFromKey(decodedKey)) ?? 0;

  if (playerId <= 0) {
    return undefined;
  }

  return fetchOrpcOptional(() =>
    getPlayerStatsCached(
      playerId,
      filter.dateMin,
      filter.dateMax,
      filter.ruleset
    )
  );
}

async function PlayerTournaments({
  playerId,
  filter,
  adjustments,
}: {
  playerId: number;
  filter: PlayerPageFilter;
  adjustments: PlayerRatingAdjustment[];
}) {
  const tournaments = await getPlayerTournamentsCached(
    playerId,
    filter.dateMin,
    filter.dateMax,
    filter.ruleset
  );

  return (
    <PlayerTournamentsList
      tournaments={tournaments}
      adjustments={adjustments}
    />
  );
}

async function PlayerBeatmaps({
  playerId,
  ruleset,
}: {
  playerId: number;
  ruleset: Ruleset;
}) {
  const { beatmaps, totalCount } = await getPlayerBeatmapsCached(
    playerId,
    ruleset,
    INITIAL_BEATMAPS_LIMIT,
    0
  );

  return (
    <PlayerBeatmapsList
      playerId={playerId}
      ruleset={ruleset}
      initialBeatmaps={beatmaps}
      totalCount={totalCount}
    />
  );
}

export default async function PlayerPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const { id } = parseParamsOrNotFound(
    playerPageParamsSchema,
    await props.params
  );
  const filter = playerPageFilterSchema.parse(searchParams);

  const decodedId = decodeURIComponent(id);
  const playerData = await getPlayerData(decodedId, filter);

  if (!playerData) {
    return notFound();
  }

  const canonicalPlayerId = playerData.playerInfo.id;

  // Canonicalize the URL onto the o!TR ID
  if (canonicalPlayerId && canonicalPlayerId.toString() !== decodedId) {
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

  // The stats resolve a missing or invalid ruleset to the player's default
  const currentRuleset = playerData.ruleset;

  const chartHighestRating = playerData.rating?.adjustments?.length
    ? playerData.rating.adjustments.reduce(
        (max, adjustment) => Math.max(max, adjustment.ratingAfter),
        playerData.rating.adjustments[0].ratingAfter
      )
    : (playerData.matchStats?.highestRating ?? undefined);

  return (
    <div className="container mx-auto flex flex-col gap-4 md:gap-2">
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
          {(playerData.modStats ||
            playerData.frequentTeammates ||
            playerData.frequentOpponents) && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-2">
              {playerData.modStats && (
                <>
                  <PlayerModStatsChart
                    className="w-full"
                    modStats={playerData.modStats}
                  />
                  <PlayerModCountChart
                    className="w-full"
                    modStats={playerData.modStats}
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

      <SectionErrorBoundary title="Tournament history could not load">
        <Suspense fallback={<PlayerTournamentsSkeleton />}>
          <PlayerTournaments
            playerId={canonicalPlayerId}
            filter={{ ...filter, ruleset: currentRuleset }}
            adjustments={playerData.rating?.adjustments ?? []}
          />
        </Suspense>
      </SectionErrorBoundary>

      <SectionErrorBoundary title="Pooled beatmaps could not load">
        <Suspense fallback={<PlayerBeatmapsSkeleton />}>
          <PlayerBeatmaps
            playerId={canonicalPlayerId}
            ruleset={currentRuleset}
          />
        </Suspense>
      </SectionErrorBoundary>
    </div>
  );
}
