'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { useState } from 'react';
import { PlayerTournamentListItem } from '@/lib/orpc/schema/tournament';
import { PlayerRatingAdjustment } from '@/lib/orpc/schema/playerStats';
import PlayerTournamentCard from './PlayerTournamentCard';

interface PlayerTournamentsListProps {
  tournaments: PlayerTournamentListItem[];
  adjustments: PlayerRatingAdjustment[];
}

export default function PlayerTournamentsList({
  tournaments,
  adjustments,
}: PlayerTournamentsListProps) {
  const NUM_INITIAL_DISPLAY = 5;
  const NUM_LOAD_MORE = 25;
  const [displayCount, setDisplayCount] = useState(NUM_INITIAL_DISPLAY);

  // Get tournaments up to the current display count
  const displayedTournaments = tournaments.slice(0, displayCount);

  if (tournaments.length === 0) {
    return <NoResultsCard />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center gap-2">
          <Trophy className="text-primary h-6 w-6" />
          <CardTitle
            data-testid="tournament-history-title"
            className="text-xl font-bold"
          >
            Tournament History
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col space-y-4">
        {displayedTournaments.map((tournament) => (
          <PlayerTournamentCard
            key={tournament.id}
            tournament={tournament}
            adjustments={adjustments}
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
          <CardTitle
            data-testid="tournament-history-title"
            className="text-xl font-bold"
          >
            Tournament History
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-2 text-center">
        <p className="text-muted-foreground">No tournament data available</p>
      </CardContent>
    </Card>
  );
}
