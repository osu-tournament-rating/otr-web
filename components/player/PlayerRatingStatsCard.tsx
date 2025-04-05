import { PlayerRatingStatsDTO } from '@osu-tournament-rating/otr-api-client';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import TierIcon from '@/components/icons/TierIcon';
import { Sword, Trophy, Crosshair, BarChart4, Globe, Flag } from 'lucide-react';
import { getTierString, TierName } from '@/lib/utils/tierData';

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
    <Card className="space-y-6 p-6">
      {/* Tier Progress Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <TierIcon
            tier={(rating.tierProgress.currentTier as TierName) || ''}
            subTier={rating.tierProgress?.currentSubTier}
            includeSubtierInTooltip
            width={48}
            height={48}
          />
          <div className="flex-1">
            <div className="mb-2 flex justify-between">
              <span className="font-medium">
                {getTierString(
                  rating.tierProgress.currentTier as TierName,
                  rating.tierProgress.currentSubTier
                )}
              </span>
              {rating.tierProgress.nextSubTier !== null && (
                <span className="text-muted-foreground">
                  {(rating.tierProgress.nextSubTier === 3 && rating.tierProgress.nextMajorTier) || 
                   (rating.tierProgress.currentTier === 'Grandmaster' && rating.tierProgress.currentSubTier === 1)
                    ? getTierString(
                        (rating.tierProgress.currentTier === 'Grandmaster' && rating.tierProgress.currentSubTier === 1)
                          ? 'Elite Grandmaster' as TierName
                          : rating.tierProgress.nextMajorTier as TierName,
                        rating.tierProgress.currentTier === 'Grandmaster' && rating.tierProgress.currentSubTier === 1 ? undefined : 3
                      )
                    : getTierString(
                        rating.tierProgress.currentTier as TierName,
                        rating.tierProgress.nextSubTier
                      )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <TierIcon
                tier={(rating.tierProgress.currentTier as TierName) || ''}
                subTier={rating.tierProgress?.currentSubTier}
                includeSubtierInTooltip
                width={24}
                height={24}
              />
              <Progress
                value={(rating.tierProgress?.subTierFillPercentage || 0) * 100}
                className="h-3 flex-1 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-emerald-500"
              />
              {rating.tierProgress.nextSubTier !== null && (
                <TierIcon
                  tier={
                    (rating.tierProgress.nextSubTier === 3 && rating.tierProgress.nextMajorTier) ||
                    (rating.tierProgress.currentTier === 'Grandmaster' && rating.tierProgress.currentSubTier === 1)
                      ? ((rating.tierProgress.currentTier === 'Grandmaster' && rating.tierProgress.currentSubTier === 1)
                          ? 'Elite Grandmaster' as TierName
                          : rating.tierProgress.nextMajorTier as TierName)
                      : (rating.tierProgress.currentTier as TierName)
                  }
                  subTier={
                    (rating.tierProgress.currentTier === 'Grandmaster' && rating.tierProgress.currentSubTier === 1)
                      ? undefined
                      : rating.tierProgress.nextSubTier
                  }
                  includeSubtierInTooltip
                  width={24}
                  height={24}
                />
              )}
            </div>
            <div className="mt-2 flex justify-between text-sm text-muted-foreground">
              <span>Sub-tier progress</span>
              <span>
                {toPercentage(rating.tierProgress?.subTierFillPercentage || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
          <Trophy className="h-6 w-6 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Tournaments</p>
            <p className="text-xl font-semibold">
              {rating.tournamentsPlayed || 0}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
          <Sword className="h-6 w-6 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Matches</p>
            <p className="text-xl font-semibold">{rating.matchesPlayed || 0}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
          <Crosshair className="h-6 w-6 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Win Rate</p>
            <p className="text-xl font-semibold">
              {rating.winRate ? toPercentage(rating.winRate) : 'N/A'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
          <BarChart4 className="h-6 w-6 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Percentile</p>
            <p className="text-xl font-semibold">
              {rating.percentile ? toPercentage(rating.percentile) : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Rank Section */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
          <Globe className="h-6 w-6 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Global Rank</p>
            <p className="text-xl font-semibold">
              #{toLocaleString(rating.globalRank)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
          <Flag className="h-6 w-6 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Country Rank</p>
            <p className="text-xl font-semibold">
              #{toLocaleString(rating.countryRank)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
