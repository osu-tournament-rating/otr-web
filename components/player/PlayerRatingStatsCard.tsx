import {
  PlayerRatingStatsDTO,
  Ruleset,
} from '@osu-tournament-rating/otr-api-client';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import TierIcon from '@/components/icons/TierIcon';
import {
  Trophy,
  Globe,
  Flag,
  User,
  Swords,
  PercentCircle,
  BarChart4,
  ExternalLink,
} from 'lucide-react';
import { getTierString, TierName } from '@/lib/utils/tierData';
import TRText from '../rating/TRText';
import { StatCard } from './StatCard';
import PlayerCard from './PlayerCard';

export default function PlayerRatingStatsCard({
  rating,
}: {
  rating: PlayerRatingStatsDTO;
  currentRuleset: Ruleset;
}) {
  const toPercentage = (value: number) => {
    if (value === undefined || value === null) return 'N/A';
    const formattedValue =
      value < 1 ? (value * 100).toFixed(2) : value.toFixed(2);
    return `${formattedValue}%`;
  };
  const toLocaleString = (value: number) => value.toLocaleString();

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
                  includeSubtierInTooltip
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
              <span className='text-nowrap'>
                {rating.rating.toFixed()} <TRText />
              </span>
            }
            icon={<BarChart4 className="h-5 w-5 text-primary" />}
          />

          {/* Global Rank Card */}
          <StatCard
            label="Global"
            value={`#${toLocaleString(rating.globalRank)}`}
            icon={<Globe className="h-5 w-5 text-primary" />}
            className="gap-2 p-3"
          />

          {/* Country Rank Card */}
          <StatCard
            label="Country"
            value={`#${toLocaleString(rating.countryRank)}`}
            icon={<Flag className="h-5 w-5 text-primary" />}
            className="gap-2 p-3"
          />

          {/* Percentile Card */}
          <StatCard
            label="Percentile"
            value={rating.percentile ? toPercentage(rating.percentile) : 'N/A'}
            icon={<PercentCircle className="h-6 w-6 text-primary" />}
          />
        </div>

        {/* Tier Progress Card - Only show if there's a next tier */}
        {rating.tierProgress.nextMajorTier && (
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xl font-semibold">Tier Progress</span>
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-primary">
                  {rating.tierProgress.ratingForNextMajorTier.toFixed()}{' '}
                </span>
                <TRText className="-ml-1 text-xs" /> until{' '}
                {getTierString(
                  rating.tierProgress.nextMajorTier as TierName,
                  3
                )}
              </span>
            </div>

            <div className="flex">
              <div className="flex h-16 w-16 items-end justify-center">
                <TierIcon
                  tier={(rating.tierProgress.currentTier as TierName) || ''}
                  subTier={3}
                  includeSubtierInTooltip
                  width={32}
                  height={32}
                />
              </div>

              {/* Tier progress bars */}
              <div className="flex flex-1 items-center gap-2">
                <div className="flex flex-1 flex-col">
                  <div className="mb-2 text-center font-medium text-muted-foreground">
                    III
                  </div>
                  <Progress
                    value={Math.min(
                      (rating.tierProgress?.majorTierFillPercentage || 0) * 300,
                      100
                    )}
                    className="h-1 w-full bg-primary/10"
                  />
                </div>

                <div className="flex flex-1 flex-col">
                  <div className="mb-2 text-center font-medium text-muted-foreground">
                    II
                  </div>
                  <Progress
                    value={Math.max(
                      0,
                      Math.min(
                        (rating.tierProgress?.majorTierFillPercentage || 0) *
                          300 -
                          100,
                        100
                      )
                    )}
                    className="h-1 w-full bg-primary/10"
                  />
                </div>

                <div className="flex flex-1 flex-col">
                  <div className="mb-2 text-center font-medium text-muted-foreground">
                    I
                  </div>
                  <Progress
                    value={Math.max(
                      0,
                      (rating.tierProgress?.majorTierFillPercentage || 0) *
                        300 -
                        200
                    )}
                    className="h-1 w-full bg-primary/10"
                  />
                </div>
              </div>

              <div className="flex h-16 w-16 items-end justify-center">
                <TierIcon
                  tier={rating.tierProgress.nextMajorTier as TierName}
                  subTier={3}
                  includeSubtierInTooltip
                  width={32}
                  height={32}
                />
              </div>
            </div>
          </div>
        )}
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
