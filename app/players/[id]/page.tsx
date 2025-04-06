import PlayerModStatsChart from '@/components/player/PlayerModStatsChart';
import PlayerRatingChart from '@/components/player/PlayerRatingChart';
import PlayerRatingStatsCard from '@/components/player/PlayerRatingStatsCard';
import { getStats } from '@/lib/actions/players';
import {
  PlayerDashboardStatsDTO,
  Ruleset,
} from '@osu-tournament-rating/otr-api-client';
import { toast } from 'sonner';

type PageProps = {
  params: { id: string }; // Player search key from path
  searchParams: { [key: string]: string | string[] | undefined };
};

async function getPlayerData(
  key: string,
  searchParams: { [key: string]: string | string[] | undefined }
): Promise<PlayerDashboardStatsDTO | undefined> {
  // Parse date filters from URL params
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
    const result = await getStats({
      key: key,
      dateMin: dateMin,
      dateMax: dateMax,
      ruleset: ruleset,
    });

    return result;
  } catch (error) {
    console.error(error);
    toast.error(
      'Failed to fetch player data. Please check the console logs and report to the developers if needed!'
    );

    return undefined;
  }
}

export default async function PlayerPage({ params, searchParams }: PageProps) {
  const playerData = await getPlayerData(params.id, searchParams);

  // Handle case where player data might not be found
  if (!playerData || !playerData.rating) {
    // You might want to redirect to a 404 page or show a message
    return <div>Player not found.</div>;
  }

  return (
    <div className="mx-auto flex flex-col gap-2 p-4">
      {/* Render the PlayerRatingCard with the fetched rating data */}
      <PlayerRatingStatsCard rating={playerData.rating} />
      <PlayerRatingChart
        adjustments={playerData.rating.adjustments}
        highestRating={
          playerData.matchStats?.highestRating ?? playerData.rating.rating
        }
      />

      {/* Display mod statistics if available */}
      {playerData.modStats && playerData.modStats.length > 0 && (
        <PlayerModStatsChart modStats={playerData.modStats} />
      )}
    </div>
  );
}
