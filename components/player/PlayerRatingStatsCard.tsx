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
import StatCard from '../shared/StatCard';
import PlayerCard from './PlayerCard';
import PlayerTierProgress from './PlayerTierProgress';
import CountryFlag from '@/components/shared/CountryFlag';
import Link from 'next/link';

function formatPercentage(value: number | undefined | null): string {
  if (value === undefined || value === null) return 'N/A';
  const formattedValue = value.toFixed(2);
  return `${formattedValue}%`;
}

interface PlayerRatingStatsCardProps {
  rating: PlayerRatingStatsDTO;
  currentRuleset: Ruleset;
}

export default function PlayerRatingStatsCard({
  rating,
  currentRuleset,
}: PlayerRatingStatsCardProps) {
  return (
    <Card className="p-6 font-sans">
      <PlayerCard player={rating.player} ruleset={rating.ruleset} />
      <div className="flex flex-col gap-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {/* Tier Card */}
          <StatCard
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
            className="col-span-2 md:col-span-3 lg:col-span-2"
          />

          {/* Rating Card */}
          <StatCard
            label="Rating"
            value={
              <span className="flex items-baseline gap-1 text-nowrap">
                {rating.rating.toFixed()}
                <TRText />
              </span>
            }
            icon={<BarChart4 className="h-5 w-5 text-primary" />}
            className="lg:col-span-1"
          />

          {/* Global Rank Card */}
          <StatCard
            label="Global"
            value={`#${rating.globalRank.toLocaleString()}`}
            icon={<Globe className="h-5 w-5 text-primary" />}
            className="lg:col-span-1"
          />

          {/* Country Rank Card */}
          <StatCard
            label="Country"
            value={
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/leaderboard?country=${rating.player.country}&ruleset=${currentRuleset}`}
                  className="transition-opacity hover:opacity-80"
                  title={`View ${rating.player.country} leaderboard`}
                >
                  <CountryFlag country={rating.player.country} />
                </Link>
                <span>{`#${rating.countryRank.toLocaleString()}`}</span>
              </div>
            }
            icon={<Flag className="h-5 w-5 text-primary" />}
          />

          {/* Percentile Card */}
          <StatCard
            label="Percentile"
            value={formatPercentage(rating.percentile)}
            icon={<PercentCircle className="h-6 w-6 text-primary" />}
          />

          {/* Tournaments Card */}
          <StatCard
            label="Tournaments"
            value={rating.tournamentsPlayed || 0}
            icon={<Trophy className="h-6 w-6 text-primary" />}
          />

          {/* Matches Card */}
          <StatCard
            label="Matches"
            value={rating.matchesPlayed || 0}
            icon={<Swords className="h-6 w-6 text-primary" />}
          />
        </div>

        {/* Tier Progress Card - Only show if there's a next tier */}
        <PlayerTierProgress tierProgress={rating.tierProgress} />
      </div>
    </Card>
  );
}
