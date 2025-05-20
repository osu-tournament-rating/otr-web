import {
  PlayerRatingStatsDTO,
  Ruleset,
} from '@osu-tournament-rating/otr-api-client';
import { Card } from '@/components/ui/card';
import TierIcon from '@/components/icons/TierIcon';
import {
  Trophy,
  Globe,
  Flag,
  Swords,
  PercentCircle,
  BarChart4,
} from 'lucide-react';
import { getTierString, TierName } from '@/lib/utils/tierData';
import TRText from '../rating/TRText';
import { StatCard } from './StatCard';
import PlayerCard from './PlayerCard';
import PlayerTierProgress from './PlayerTierProgress';

function formatPercentage(value: number | undefined | null): string {
  if (value === undefined || value === null) return 'N/A';
  const formattedValue =
    value < 1 ? (value * 100).toFixed(2) : value.toFixed(2);
  return `${formattedValue}%`;
}

export default function PlayerRatingStatsCard({
  rating,
}: {
  rating: PlayerRatingStatsDTO;
  currentRuleset: Ruleset;
}) {
  return (
    <Card className="p-6 font-sans">
      <PlayerCard player={rating.player} />
      <div className="flex flex-col gap-4">
        {/* Stats Cards */}
        <div className="flex min-w-[250px] flex-wrap gap-2">
          {/* Tier Card */}
          <StatCard
            bordered
            label="Tier"
            value={
              <span className="text-nowrap">
                {getTierString(
                  rating.tierProgress.currentTier as TierName,
                  rating.tierProgress.currentSubTier
                )}
              </span>
            }
            icon={
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
                <TierIcon
                  tier={(rating.tierProgress.currentTier as TierName) || ''}
                  subTier={rating.tierProgress?.currentSubTier}
                  tooltip
                  width={32}
                  height={32}
                />
              </div>
            }
            className="gap-2 px-3"
          />

          {/* Rating Card */}
          <StatCard
            bordered
            label="Rating"
            value={
              <span className="text-nowrap">
                {rating.rating.toFixed()} <TRText />
              </span>
            }
            icon={<BarChart4 className="h-5 w-5 text-primary" />}
          />

          {/* Global Rank Card */}
          <StatCard
            label="Global"
            value={`#${rating.globalRank.toLocaleString()}`}
            icon={<Globe className="h-5 w-5 text-primary" />}
            className="gap-2 p-3"
          />

          {/* Country Rank Card */}
          <StatCard
            label="Country"
            value={`#${rating.countryRank.toLocaleString()}`}
            icon={<Flag className="h-5 w-5 text-primary" />}
            className="gap-2 p-3"
          />

          {/* Percentile Card */}
          <StatCard
            label="Percentile"
            value={formatPercentage(rating.percentile)}
            icon={<PercentCircle className="h-6 w-6 text-primary" />}
          />
        </div>

        {/* Tier Progress Card - Only show if there's a next tier */}
        <PlayerTierProgress tierProgress={rating.tierProgress} />
      </div>

      {/* Stats Section */}
      <div className="flex flex-wrap gap-3">
        <StatCard
          label="Tournaments"
          value={rating.tournamentsPlayed || 0}
          icon={<Trophy className="h-6 w-6 text-primary" />}
        />

        <StatCard
          label="Matches"
          value={rating.matchesPlayed || 0}
          icon={<Swords className="h-6 w-6 text-primary" />}
        />
      </div>
    </Card>
  );
}
