'use client';

import { Ruleset } from '@/lib/osu/enums';

import { TournamentPlayerStats } from '@/lib/orpc/schema/tournament';

import TournamentTopPerformers from './TournamentTopPerformers';

interface TournamentPlayerStatsDashboardProps {
  playerStats: TournamentPlayerStats[];
  className?: string;
  ruleset: Ruleset;
}

export default function TournamentPlayerStatsDashboard({
  playerStats,
  className,
  ruleset,
}: TournamentPlayerStatsDashboardProps) {
  if (!playerStats || playerStats.length === 0) {
    return (
      <div className={className}>
        <p className="py-8 text-center text-muted-foreground">
          No player statistics available for this tournament.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid gap-6">
        {/* Top row - Key highlights */}
        <TournamentTopPerformers playerStats={playerStats} ruleset={ruleset} />

        {/* More can live here */}
      </div>
    </div>
  );
}
