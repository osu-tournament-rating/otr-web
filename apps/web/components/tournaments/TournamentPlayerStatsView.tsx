import { Ruleset, VerificationStatus } from '@otr/core/osu';
import { Trophy } from 'lucide-react';

import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { Panel } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import TournamentTopPerformers from '@/components/tournaments/TournamentTopPerformers';
import { getTournamentStatsEmptyCopy } from '@/components/tournaments/statsEmptyCopy';
import { TournamentPlayerStats } from '@/lib/orpc/schema/tournament';

/** The Stats tab's player section: the top performers, when there are stats. */
export default function TournamentPlayerStatsView({
  playerStats,
  ruleset,
  verificationStatus,
}: {
  playerStats: TournamentPlayerStats[];
  ruleset: Ruleset;
  /** Says why there are no player statistics yet. */
  verificationStatus: VerificationStatus;
}) {
  if (playerStats.length === 0) {
    return (
      <Panel>
        <SectionHeader icon={Trophy} title="Top performers" />
        <EmptyState
          size="compact"
          icon={Trophy}
          {...getTournamentStatsEmptyCopy(
            verificationStatus,
            'Player statistics'
          )}
        />
      </Panel>
    );
  }

  return (
    <TournamentTopPerformers playerStats={playerStats} ruleset={ruleset} />
  );
}
