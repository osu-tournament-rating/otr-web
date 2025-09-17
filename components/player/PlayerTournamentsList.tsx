'use client';

import {
  RatingAdjustmentDTO,
  Ruleset,
  TournamentCompactDTO,
} from '@osu-tournament-rating/otr-api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { useState } from 'react';
import PlayerTournamentCard from './PlayerTournamentCard';

interface PlayerTournamentsListProps {
  tournaments: TournamentCompactDTO[];
  ruleset: Ruleset;
  adjustments: RatingAdjustmentDTO[];
}

export default function PlayerTournamentsList({
  tournaments,
  ruleset,
  adjustments,
}: PlayerTournamentsListProps) {
  const [showAll, setShowAll] = useState(false);

  // Filter tournaments by ruleset
  const filteredTournaments = tournaments.filter(
    (tournament) => tournament.ruleset === ruleset
  );

  // Get either all tournaments or just the most recent 3
  const displayedTournaments = showAll
    ? filteredTournaments
    : filteredTournaments.slice(0, 3);

  if (filteredTournaments.length === 0) {
    return <NoResultsCard />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl font-bold">
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
        {filteredTournaments.length > 3 && !showAll && (
          <Button
            variant="outline"
            className="w-full justify-center"
            onClick={() => setShowAll(true)}
          >
            Show More ({filteredTournaments.length - 3} more)
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
          <Trophy className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl font-bold">
            Tournament History
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-2 text-center">
        <h3 className="text-2xl font-bold text-primary">
          No tournaments found
        </h3>
        <p className="text-muted-foreground">
          This player has not participated in any tournaments recently.
        </p>
      </CardContent>
    </Card>
  );
}
