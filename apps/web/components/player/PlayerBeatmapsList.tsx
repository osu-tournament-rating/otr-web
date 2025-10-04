'use client';

import { useState } from 'react';
import { Loader2, Music } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PlayerBeatmapCard from './PlayerBeatmapCard';
import { orpc } from '@/lib/orpc/orpc';
import { PlayerBeatmapStats } from '@/lib/orpc/schema/playerBeatmaps';
import { Ruleset } from '@otr/core/osu';

interface PlayerBeatmapsListProps {
  playerId?: number;
  ruleset?: Ruleset;
  initialBeatmaps: PlayerBeatmapStats[];
  totalCount: number;
}

export default function PlayerBeatmapsList({
  playerId,
  ruleset,
  initialBeatmaps,
  totalCount: initialTotal,
}: PlayerBeatmapsListProps) {
  const LOAD_MORE_COUNT = 25;
  const [beatmaps, setBeatmaps] =
    useState<PlayerBeatmapStats[]>(initialBeatmaps);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (totalCount === 0) {
    return <NoResultsCard />;
  }

  const remainingCount = Math.max(totalCount - beatmaps.length, 0);

  const handleLoadMore = async () => {
    if (isLoading || remainingCount === 0 || !playerId) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await orpc.players.beatmaps({
        playerId,
        ruleset,
        offset: beatmaps.length,
        limit: LOAD_MORE_COUNT,
      });

      const existingIds = new Set(beatmaps.map((beatmap) => beatmap.id));
      const newBeatmaps = response.beatmaps.filter(
        (beatmap) => !existingIds.has(beatmap.id)
      );

      setBeatmaps((prev) => [...prev, ...newBeatmaps]);
      setTotalCount(response.totalCount);
    } catch (error) {
      console.error('Failed to load additional beatmaps', error);
      setErrorMessage('Failed to load more beatmaps. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center gap-2">
          <Music className="text-primary h-6 w-6" />
          <CardTitle className="text-xl font-bold">Pooled Beatmaps</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col space-y-4">
        {beatmaps.map((beatmap) => (
          <PlayerBeatmapCard key={beatmap.id} beatmap={beatmap} />
        ))}
        {errorMessage && (
          <p className="text-destructive text-sm" role="alert">
            {errorMessage}
          </p>
        )}
        {remainingCount > 0 && playerId && (
          <Button
            variant="outline"
            className="w-full justify-center"
            disabled={isLoading}
            onClick={handleLoadMore}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Loading…
              </>
            ) : (
              `Show More (${remainingCount} more)`
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function NoResultsCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center gap-2">
          <Music className="text-primary h-6 w-6" />
          <CardTitle className="text-xl font-bold">Pooled Beatmaps</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-2 text-center">
        <p className="text-muted-foreground">No pooled beatmaps found</p>
      </CardContent>
    </Card>
  );
}
