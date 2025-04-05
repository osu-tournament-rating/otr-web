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
  Crown,
  PercentCircle,
  BarChart4,
  ExternalLink,
} from 'lucide-react';
import { getTierString, TierName } from '@/lib/utils/tierData';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import TRText from '../rating/TRText';
import Link from 'next/link';

export default function PlayerRatingStatsCard({
  rating,
}: {
  rating: PlayerRatingStatsDTO;
}) {
  const toPercentage = (value: number) => {
    const formattedValue =
      value < 1 ? (value * 100).toFixed(2) : value.toFixed(2);
    return `${formattedValue}%`;
  };
  const toLocaleString = (value: number) => value.toLocaleString();

  return (
    <Card className="p-6 font-sans">
      {/* Player Info and Stats Section */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-4">
          {/* Player Card */}
          <div className="flex min-w-[250px] flex-1/2 items-center gap-3 rounded-lg bg-muted/50 p-4">
            <Avatar className="h-16 w-16 transition-all hover:border-primary/80">
              <AvatarImage
                src={`https://a.ppy.sh/${rating.player.osuId}`}
                alt={rating.player.username}
              />
              <AvatarFallback>
                <User className="h-9 w-9" />
              </AvatarFallback>
            </Avatar>
            <p className="text-xl font-bold">{rating.player.username}</p>
            <Link
              href={`https://osu.ppy.sh/u/${rating.player.osuId}`}
              target="_blank"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground/50" />
            </Link>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
            <BarChart4 className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Rating</p>
              <div className="flex items-end">
                <p className="text-xl font-semibold">
                  {rating.rating.toFixed()}
                </p>
                <TRText />
              </div>
            </div>
          </div>
          {/* Current tier card - Full width */}
          <div
            className={`flex items-center gap-2 rounded-lg p-3 ${
              !rating.tierProgress.nextMajorTier
                ? 'bg-gradient-to-r from-accent/20 via-accent/30 to-accent/20'
                : 'bg-muted/50'
            }`}
          >
            {!rating.tierProgress.nextMajorTier && (
              <TierIcon
                className="absolute animate-[ping_10s_cubic-bezier(0,1,0,1)_infinite]"
                tier={(rating.tierProgress.currentTier as TierName) || ''}
                subTier={rating.tierProgress?.currentSubTier}
                includeSubtierInTooltip
                width={28}
                height={28}
              />
            )}
            <TierIcon
              tier={(rating.tierProgress.currentTier as TierName) || ''}
              subTier={rating.tierProgress?.currentSubTier}
              includeSubtierInTooltip
              width={28}
              height={28}
            />
            <div>
              <p className="text-xs text-muted-foreground">Tier</p>
              <p className="text-sm font-semibold">
                {getTierString(
                  rating.tierProgress.currentTier as TierName,
                  rating.tierProgress.currentSubTier
                )}
                {!rating.tierProgress.nextMajorTier}
              </p>
            </div>
          </div>

          {/* Rank Cards */}
          <div className="flex min-w-[250px] flex-1 flex-wrap gap-2">
            <div className="flex min-w-[120px] flex-1 items-center gap-2 rounded-lg bg-muted/50 p-3">
              <Globe className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Global</p>
                <p className="text-sm font-semibold">
                  #{toLocaleString(rating.globalRank)}
                </p>
              </div>
            </div>

            <div className="flex min-w-[120px] flex-1 items-center gap-2 rounded-lg bg-muted/50 p-3">
              <Flag className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Country</p>
                <p className="text-sm font-semibold">
                  #{toLocaleString(rating.countryRank)}
                </p>
              </div>
            </div>
          </div>
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
              <div className="flex flex-1/3 justify-end">
                <TierIcon
                  tier={rating.tierProgress.currentTier as TierName}
                  subTier={2}
                  includeSubtierInTooltip
                  width={24}
                  height={24}
                />
              </div>
              <div className="flex flex-1/3 justify-end">
                <TierIcon
                  tier={rating.tierProgress.nextTier as TierName}
                  subTier={1}
                  includeSubtierInTooltip
                  width={24}
                  height={24}
                />
              </div>
              {/* Do not remove */}
              <div className="flex-1/3" />
            </div>

            <div className="mt-4 flex flex-wrap gap-4">
              {/* Next Sub-tier Card */}
              <div className="flex min-w-[200px] flex-1 items-center gap-3 rounded-lg border border-muted bg-muted/30 p-4">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
                  <TierIcon
                    tier={rating.tierProgress.nextTier as TierName}
                    subTier={rating.tierProgress.nextSubTier}
                    includeSubtierInTooltip
                    width={32}
                    height={32}
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next Tier</p>
                  <p className="text-lg font-semibold">
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
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Section */}
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-1 items-center gap-3 rounded-lg bg-muted/50 p-4">
          <Trophy className="text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Tournaments</p>
            <p className="text-xl font-semibold">
              {rating.tournamentsPlayed || 0}
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center gap-3 rounded-lg bg-muted/50 p-4">
          <Swords className="h-6 w-6 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Matches</p>
            <p className="text-xl font-semibold">{rating.matchesPlayed || 0}</p>
          </div>
        </div>

        <div className="flex flex-1 items-center gap-3 rounded-lg bg-muted/50 p-4">
          <Crown className="h-6 w-6 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Win Rate</p>
            <p className="text-xl font-semibold">
              {rating.winRate ? toPercentage(rating.winRate) : 'N/A'}
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center gap-3 rounded-lg bg-muted/50 p-4">
          <PercentCircle className="h-6 w-6 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Percentile</p>
            <p className="text-xl font-semibold">
              {rating.percentile ? toPercentage(rating.percentile) : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
