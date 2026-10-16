import { Ruleset } from '@otr/core/osu';
import { Trophy } from 'lucide-react';

import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { Panel } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { TournamentPlayerStats } from '@/lib/orpc/schema/tournament';

import TournamentTopPerformers from './TournamentTopPerformers';

/** The Stats tab's player section: the top performers, when there are stats. */
export default function TournamentPlayerStatsView({
  playerStats,
  ruleset,
}: {
  playerStats: TournamentPlayerStats[];
  ruleset: Ruleset;
}) {
  if (playerStats.length === 0) {
    return (
      <Panel>
        <SectionHeader icon={Trophy} title="Top performers" />
        <EmptyState
          size="compact"
          icon={Trophy}
          title="No player statistics"
          description="No player statistics available for this tournament."
        />
      </Panel>
    );
  }

  return (
    <TournamentTopPerformers playerStats={playerStats} ruleset={ruleset} />
  );
}
