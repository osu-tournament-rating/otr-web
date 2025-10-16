'use client';

import { Ruleset } from '@otr/core/osu';
import { TournamentPlayerStats } from '@/lib/orpc/schema/tournament';

import TournamentTopPerformers from './TournamentTopPerformers';

interface TournamentPlayerStatsViewProps {
  playerStats: TournamentPlayerStats[];
  className?: string;
  ruleset: Ruleset;
}

export default function TournamentPlayerStatsView({
  playerStats,
  className,
  ruleset,
}: TournamentPlayerStatsViewProps) {
  if (!playerStats || playerStats.length === 0) {
    return (
      <div className={className}>
        <p className="text-muted-foreground py-8 text-center">
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
