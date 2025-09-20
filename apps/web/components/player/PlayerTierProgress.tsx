'use client';

import { getTierString, TierName } from '@/lib/utils/tierData';
import TierIcon from '../icons/TierIcon';
import TRText from '../rating/TRText';
import { Progress } from '../ui/progress';
import SimpleTooltip from '../simple-tooltip';
import type { PlayerRatingStats } from '@/lib/orpc/schema/playerDashboard';

interface TierProgressProps {
  rating: PlayerRatingStats;
}

export default function PlayerTierProgress({ rating }: TierProgressProps) {
  const { tierProgress } = rating;
  const ratingNeeded = tierProgress.ratingForNextMajorTier - rating.rating;

  if (!tierProgress.nextMajorTier) return null;

  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xl font-semibold">Tier Progress</span>
        <span className="text-muted-foreground">
          <span className="text-primary font-semibold">
            {ratingNeeded.toFixed(0)}
          </span>
          <span className="inline-block w-[0.125em]" />
          <TRText className="text-xs" /> until{' '}
          {getTierString(tierProgress.nextMajorTier as TierName, 3)}
        </span>
      </div>

      <div className="flex">
        <div className="flex h-16 w-16 items-end justify-center">
          <SimpleTooltip
            content={getTierString(tierProgress.currentTier as TierName, 3)}
          >
            <div>
              <TierIcon
                tier={(tierProgress.currentTier as TierName) || ''}
                subTier={3}
                width={32}
                height={32}
              />
            </div>
          </SimpleTooltip>
        </div>

        {/* Tier progress bars */}
        <div className="flex flex-1 items-center gap-2">
          {[3, 2, 1].map((subtier) => (
            <div key={subtier} className="flex flex-1 flex-col">
              <div className="text-muted-foreground mb-2 text-center font-medium">
                {subtier === 3 ? 'III' : subtier === 2 ? 'II' : 'I'}
              </div>
              <Progress
                value={Math.max(
                  0,
                  Math.min(
                    (tierProgress.majorTierFillPercentage || 0) * 300 -
                      (3 - subtier) * 100,
                    100
                  )
                )}
                className="bg-accent h-1 w-full"
              />
            </div>
          ))}
        </div>

        <div className="flex h-16 w-16 items-end justify-center">
          <SimpleTooltip
            content={getTierString(tierProgress.nextMajorTier as TierName, 3)}
          >
            <div>
              <TierIcon
                tier={tierProgress.nextMajorTier as TierName}
                subTier={3}
                width={32}
                height={32}
              />
            </div>
          </SimpleTooltip>
        </div>
      </div>
    </div>
  );
}
