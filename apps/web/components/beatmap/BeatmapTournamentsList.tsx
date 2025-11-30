'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { useState } from 'react';
import type { BeatmapTournamentUsage } from '@/lib/orpc/schema/beatmapStats';
import BeatmapTournamentCard from './BeatmapTournamentCard';

interface BeatmapTournamentsListProps {
  tournaments: BeatmapTournamentUsage[];
  beatmapOsuId: number;
}

export default function BeatmapTournamentsList({
  tournaments,
  beatmapOsuId,
}: BeatmapTournamentsListProps) {
  const NUM_INITIAL_DISPLAY = 5;
  const NUM_LOAD_MORE = 25;
  const [displayCount, setDisplayCount] = useState(NUM_INITIAL_DISPLAY);

  const displayedTournaments = tournaments.slice(0, displayCount);

  if (tournaments.length === 0) {
    return <NoResultsCard />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center gap-2">
          <Trophy className="text-primary h-6 w-6" />
          <CardTitle className="text-xl font-bold">Tournament Usage</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col space-y-4">
        {displayedTournaments.map((tournament) => (
          <BeatmapTournamentCard
            key={tournament.tournament.id}
            tournament={tournament}
            beatmapOsuId={beatmapOsuId}
          />
        ))}
        {tournaments.length > displayCount && (
          <Button
            variant="outline"
            className="w-full justify-center"
            onClick={() =>
              setDisplayCount(
                Math.min(displayCount + NUM_LOAD_MORE, tournaments.length)
              )
            }
          >
            Show More ({tournaments.length - displayCount} more)
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
          <Trophy className="text-primary h-6 w-6" />
          <CardTitle className="text-xl font-bold">Tournament Usage</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-2 text-center">
        <p className="text-muted-foreground">
          This beatmap has not been used in any verified tournaments.
        </p>
      </CardContent>
    </Card>
  );
}
