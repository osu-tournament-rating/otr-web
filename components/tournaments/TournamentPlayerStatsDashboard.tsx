'use client';

import { PlayerTournamentStatsBaseDTO, Ruleset } from '@osu-tournament-rating/otr-api-client';
import TournamentTopPerformers from './TournamentTopPerformers';

interface TournamentPlayerStatsDashboardProps {
  playerStats: PlayerTournamentStatsBaseDTO[];
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
