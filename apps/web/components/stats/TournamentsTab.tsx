import TournamentsByLobbySizeChart from '@/components/stats/TournamentsByLobbySizeChart';
import TournamentsByRulesetChart from '@/components/stats/TournamentsByRulesetChart';
import TournamentsByYearChart from '@/components/stats/TournamentsByYearChart';
import TournamentVerificationChart from '@/components/stats/TournamentVerificationChart';
import type { PlatformStats } from '@/lib/orpc/schema/stats';

/** Submitted and verified tournaments across the platform. */
export default function TournamentsTab({
  tournamentStats,
}: {
  tournamentStats: PlatformStats['tournamentStats'];
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <TournamentVerificationChart
        verificationCounts={tournamentStats.countByVerificationStatus}
      />
      <TournamentsByYearChart data={tournamentStats.verifiedByYear} />
      <TournamentsByRulesetChart data={tournamentStats.verifiedByRuleset} />
      <TournamentsByLobbySizeChart data={tournamentStats.verifiedByLobbySize} />
    </div>
  );
}
