import { PlatformStats } from '@/lib/orpc/schema/stats';
import { BarChart3 } from 'lucide-react';
import TournamentVerificationChart from './TournamentVerificationChart';
import RatingDistributionChart from './RatingDistributionChart';
import { Ruleset } from '@otr/core/osu';
import TournamentsByYearChart from './TournamentsByYearChart';
import TournamentsByRulesetChart from './TournamentsByRulesetChart';
import TournamentsByLobbySizeChart from './TournamentsByLobbySizeChart';

interface StatsPageContentProps {
  stats: PlatformStats;
}

export default function StatsPageContent({ stats }: StatsPageContentProps) {
  const { tournamentStats, ratingStats } = stats;

  return (
    <div className="container mx-auto flex flex-col gap-6 py-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-primary h-8 w-8" />
          <h1 className="text-3xl font-bold">Platform Statistics</h1>
        </div>
        <p className="text-muted-foreground">
          Statistics covering all of osu! tournaments
        </p>
      </div>

      {/* Tournament Statistics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TournamentVerificationChart
          verificationCounts={tournamentStats.countByVerificationStatus}
          className="w-full"
        />
        <TournamentsByYearChart data={tournamentStats.verifiedByYear} />
        <TournamentsByRulesetChart data={tournamentStats.verifiedByRuleset} />
        <TournamentsByLobbySizeChart
          data={tournamentStats.verifiedByLobbySize}
        />
      </div>

      {/* Rating Distribution Charts */}
      <div className="grid grid-cols-1 gap-6">
        {Object.entries(ratingStats.ratingsByRuleset)
          .filter(
            ([rulesetKey]) => parseInt(rulesetKey, 10) !== Ruleset.ManiaOther
          )
          .map(([rulesetKey, ratings]) => (
            <RatingDistributionChart
              key={rulesetKey}
              ruleset={parseInt(rulesetKey, 10) as Ruleset}
              ratings={ratings}
            />
          ))}
      </div>
    </div>
  );
}
