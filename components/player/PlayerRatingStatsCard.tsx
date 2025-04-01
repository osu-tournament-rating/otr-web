import { PlayerRatingStatsDTO } from '@osu-tournament-rating/otr-api-client';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import TierIcon from '@/components/icons/TierIcon';
import { Sword, Trophy, Crosshair, BarChart4, Globe, Flag } from 'lucide-react';
import { TierName } from '@/lib/utils/tierData';

const romanNumerals = ['I', 'II', 'III'];

export default function PlayerRatingStatsCard({
  rating,
}: {
  rating: PlayerRatingStatsDTO;
}) {
  const toPercentage = (value: number) => `${Math.round(value * 100)}%`;
  const toLocaleString = (value: number) => value.toLocaleString();

  return (
    <Card className="space-y-6 p-6">
      {/* Tier Progress Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <TierIcon
            tier={(rating.currentTier as TierName) || ''}
            subTier={rating.rankProgress?.currentSubTier}
            width={48}
            height={48}
          />
          <div className="flex-1">
            <div className="mb-2 flex justify-between">
              <span className="font-medium">
                {rating.currentTier}
                {rating.rankProgress?.currentSubTier &&
                  ` ${romanNumerals[rating.rankProgress.currentSubTier - 1]}`}
              </span>
              <span className="text-muted-foreground">
                {rating.rankProgress?.currentSubTier &&
                  (rating.rankProgress.currentSubTier === 1
                    ? `Next: ${rating.rankProgress?.nextMajorTier} III`
                    : `Next: ${rating.currentTier} ${romanNumerals[rating.rankProgress.currentSubTier - 2]}`)}
              </span>
            </div>
            <Progress
              value={(rating.rankProgress?.subTierFillPercentage || 0) * 100}
              className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-emerald-500"
            />
            <div className="mt-2 flex justify-between text-sm text-muted-foreground">
              <span>Sub-tier progress</span>
              <span>
                {toPercentage(rating.rankProgress?.subTierFillPercentage || 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">Major Tier Progress</span>
            <span className="text-sm text-muted-foreground">
              {toPercentage(rating.rankProgress?.majorTierFillPercentage || 0)}
            </span>
          </div>
          <Progress
            value={(rating.rankProgress?.majorTierFillPercentage || 0) * 100}
            className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-orange-500"
          />
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

      {rating.isProvisional && (
        <Badge variant="outline" className="w-full py-2 text-sm">
          Provisional Rating
        </Badge>
      )}
    </Card>
  );
}
