'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Music } from 'lucide-react';
import { useState } from 'react';
import PlayerBeatmapCard from './PlayerBeatmapCard';
import { PlayerBeatmapStats } from '@/lib/orpc/schema/playerBeatmaps';

interface PlayerBeatmapsListProps {
  beatmaps: PlayerBeatmapStats[];
}

export default function PlayerBeatmapsList({
  beatmaps,
}: PlayerBeatmapsListProps) {
  const NUM_INITIAL_DISPLAY = 3;
  const NUM_LOAD_MORE = 100;
  const [displayCount, setDisplayCount] = useState(NUM_INITIAL_DISPLAY);

  // Get beatmaps up to the current display count
  const displayedBeatmaps = beatmaps.slice(0, displayCount);

  if (beatmaps.length === 0) {
    return <NoResultsCard />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center gap-2">
          <Music className="text-primary h-6 w-6" />
          <CardTitle className="text-xl font-bold">Pooled Beatmaps</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col space-y-4">
        {displayedBeatmaps.map((beatmap) => (
          <PlayerBeatmapCard key={beatmap.id} beatmap={beatmap} />
        ))}
        {beatmaps.length > displayCount && (
          <Button
            variant="outline"
            className="w-full justify-center"
            onClick={() =>
              setDisplayCount((prev) =>
                Math.min(prev + NUM_LOAD_MORE, beatmaps.length)
              )
            }
          >
            Show More ({beatmaps.length - displayCount} more)
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
      <CardContent className="flex flex-col space-y-4">
        <Card className="w-full gap-2 p-6 text-center">
          <h2 className="text-xl font-semibold">No Beatmaps Found</h2>
          <p className="text-muted-foreground">
            This player has no pooled beatmaps for the selected ruleset.
          </p>
        </Card>
      </CardContent>
    </Card>
  );
}
