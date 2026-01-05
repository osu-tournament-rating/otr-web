'use client';

import { useEffect, useState } from 'react';
import { PlatformStats } from '@/lib/orpc/schema/stats';
import { BarChart3 } from 'lucide-react';
import TournamentVerificationChart from './TournamentVerificationChart';
import RatingDistributionChart from './RatingDistributionChart';
import { Ruleset } from '@otr/core/osu';
import TournamentsByYearChart from './TournamentsByYearChart';
import TournamentsByRulesetChart from './TournamentsByRulesetChart';
import TournamentsByLobbySizeChart from './TournamentsByLobbySizeChart';
import { useSession } from '@/lib/hooks/useSession';
import { orpc } from '@/lib/orpc/orpc';

interface StatsPageContentProps {
  stats: PlatformStats;
}

export default function StatsPageContent({ stats }: StatsPageContentProps) {
  const { tournamentStats, ratingStats } = stats;
  const session = useSession();
  const [userRatings, setUserRatings] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!session?.player.id) {
      setUserRatings({});
      return;
    }

    const rulesets = Object.keys(ratingStats.ratingsByRuleset)
      .map((k) => parseInt(k, 10))
      .filter((r) => r !== Ruleset.ManiaOther);

    Promise.all(
      rulesets.map((ruleset) =>
        orpc.players.stats({ id: session.player.id, keyType: 'otr', ruleset })
      )
    ).then((results) => {
      const ratings: Record<number, number> = {};
      results.forEach((result) => {
        if (result.rating) {
          ratings[result.ruleset] = result.rating.rating;
        }
      });
      setUserRatings(ratings);
    });
  }, [session?.player.id, ratingStats.ratingsByRuleset]);

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
              userRating={userRatings[parseInt(rulesetKey, 10)]}
            />
          ))}
      </div>
    </div>
  );
}
