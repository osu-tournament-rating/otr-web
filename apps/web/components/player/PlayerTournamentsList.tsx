'use client';

import TournamentCard from '../tournaments/TournamentCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { useState } from 'react';
import { TournamentListItem } from '@/lib/orpc/schema/tournament';

interface PlayerTournamentsListProps {
  tournaments: TournamentListItem[];
}

export default function PlayerTournamentsList({
  tournaments,
}: PlayerTournamentsListProps) {
  const [showAll, setShowAll] = useState(false);

  // Get either all tournaments or just the most recent 3
  const displayedTournaments = showAll ? tournaments : tournaments.slice(0, 3);

  if (tournaments.length === 0) {
    return <NoResultsCard />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center gap-2">
          <Trophy className="text-primary h-6 w-6" />
          <CardTitle className="text-xl font-bold">
            Tournament History
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col space-y-4">
        {displayedTournaments.map((tournament) => (
          <Link key={tournament.id} href={`/tournaments/${tournament.id}`}>
            <TournamentCard tournament={tournament} displayStatusText />
          </Link>
        ))}
        {tournaments.length > 3 && !showAll && (
          <Button
            variant="outline"
            className="w-full justify-center"
            onClick={() => setShowAll(true)}
          >
            Show More ({tournaments.length - 3} more)
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
          <CardTitle className="text-xl font-bold">
            Tournament History
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-2 text-center">
        <h3 className="text-primary text-2xl font-bold">
          No tournaments found
        </h3>
        <p className="text-muted-foreground">
          This player has not participated in any tournaments recently.
        </p>
      </CardContent>
    </Card>
  );
}
