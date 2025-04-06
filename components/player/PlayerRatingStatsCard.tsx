import { PlayerRatingStatsDTO } from '@osu-tournament-rating/otr-api-client';
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
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import TRText from '../rating/TRText';
import Link from 'next/link';
import { StatCard } from './StatCard';

export default function PlayerRatingStatsCard({
  rating,
}: {
  rating: PlayerRatingStatsDTO;
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
      {/* Player Info and Stats Section */}
      {/* Player Card - Takes up half the width */}
      <div className="flex flex-wrap justify-between gap-3 rounded-lg bg-muted/50 p-4">
        <div className='flex min-w-[250px] flex-1 items-center gap-3 rounded-lg'>
          <Avatar className="h-16 w-16 transition-all hover:border-primary/80">
            <AvatarImage
              src={`https://a.ppy.sh/${rating.player.osuId}`}
              alt={rating.player.username}
            />
            <AvatarFallback>
              <User className="h-9 w-9" />
            </AvatarFallback>
          </Avatar>
          <p className="text-4xl font-medium">{rating.player.username}</p>
          <Link
            href={`https://osu.ppy.sh/u/${rating.player.osuId}`}
            target="_blank"
            aria-label="View profile on osu! website"
          >
            <ExternalLink className="h-6 w-6 text-muted-foreground/50" />
          </Link>
        </div>
        {/* Ruleset selector (placeholder) */}
        <div className='flex items-center text-accent-foreground/30 p-4 font-medium rounded-4xl h-7 bg-muted'>
          <p>osu!mania 4K</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Stats Cards - Takes up the other half */}
        <div className="flex min-w-[250px] flex-1 flex-wrap gap-2">
          {/* Tier Card */}
          <StatCard
            bordered
            label="Tier"
            value={
              <p className="text-nowrap">
                {getTierString(
                  rating.tierProgress.currentTier as TierName,
                  rating.tierProgress.currentSubTier
                )}
              </p>
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
            className="px-3 gap-2"
          />

          {/* Rating Card */}
          <StatCard
            bordered
            label="Rating"
            value={
              <div className="flex items-end">
                <p>{rating.rating.toFixed()}</p>
                <TRText />
              </div>
            }
            icon={<BarChart4 className="h-5 w-5 text-primary" />}
          />

          {/* Global Rank Card */}
          <StatCard
            label="Global"
            value={`#${toLocaleString(rating.globalRank)}`}
            icon={<Globe className="h-5 w-5 text-primary" />}
            className="p-3 gap-2"
          />

          {/* Country Rank Card */}
          <StatCard
            label="Country"
            value={`#${toLocaleString(rating.countryRank)}`}
            icon={<Flag className="h-5 w-5 text-primary" />}
            className="p-3 gap-2"
          />
          {/* <div className="flex flex-1 items-center gap-3 rounded-lg bg-muted/50 p-4">
            <Crown className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-md font-semibold">
                {rating.winRate ? toPercentage(rating.winRate) : 'N/A'}
              </p>
            </div>
          </div> */}

          <StatCard
            label="Percentile"
            value={rating.percentile ? toPercentage(rating.percentile) : 'N/A'}
            icon={<PercentCircle className="h-6 w-6 text-primary" />}
          />
        </div>

        {/* Tier Progress Card - Only show if there's a next tier */}
        {rating.tierProgress.nextMajorTier && (
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="mb-2 flex justify-end">
              <span className="text-muted-foreground/50">
                Next:{' '}
                {getTierString(
                  rating.tierProgress.nextMajorTier as TierName,
                  3
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TierIcon
                tier={(rating.tierProgress.currentTier as TierName) || ''}
                subTier={3}
                includeSubtierInTooltip
                width={24}
                height={24}
              />

              <Progress
                value={
                  (rating.tierProgress?.majorTierFillPercentage || 0) * 100
                }
                className="h-3 flex-1 bg-primary/10"
              />
              <TierIcon
                tier={rating.tierProgress.nextMajorTier as TierName}
                subTier={3}
                includeSubtierInTooltip
                width={24}
                height={24}
              />
            </div>
            <div className="flex w-full px-8">
              <div className="flex flex-1 justify-end">
                <TierIcon
                  tier={rating.tierProgress.currentTier as TierName}
                  subTier={2}
                  includeSubtierInTooltip
                  width={24}
                  height={24}
                />
              </div>
              <div className="flex flex-1 justify-end">
                <TierIcon
                  tier={rating.tierProgress.currentTier as TierName}
                  subTier={1}
                  includeSubtierInTooltip
                  width={24}
                  height={24}
                />
              </div>
              {/* Do not remove */}
              <div className="flex-1" />
            </div>

            <div className="mt-4 flex flex-wrap gap-4">


              {/* Next Sub-tier Card */}
              <StatCard
                bordered
                label="Next Tier"
                value={
                  <>
                    <p className="flex items-end">
                      +{rating.tierProgress.ratingForNextTier.toFixed()}{' '}
                      <TRText />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      for{' '}
                      <span className="font-bold">
                        {getTierString(
                          rating.tierProgress.nextTier as TierName,
                          rating.tierProgress.nextSubTier
                        )}
                      </span>
                    </p>
                  </>
                }
                icon={
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
                    <TierIcon
                      tier={rating.tierProgress.nextTier as TierName}
                      subTier={rating.tierProgress.nextSubTier}
                      includeSubtierInTooltip
                      width={32}
                      height={32}
                    />
                  </div>
                }
              />
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
