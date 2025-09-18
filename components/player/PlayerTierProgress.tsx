'use client';

import { getTierString, TierName } from '@/lib/utils/tierData';
import TierIcon from '../icons/TierIcon';
import TRText from '../rating/TRText';
import { Progress } from '../ui/progress';
import SimpleTooltip from '../simple-tooltip';
import type { PlayerRatingStats } from '@/lib/orpc/schema/playerDashboard';

interface TierProgressProps {
  tierProgress: PlayerRatingStats['tierProgress'];
}

export default function PlayerTierProgress({
  tierProgress,
}: TierProgressProps) {
  if (!tierProgress.nextMajorTier) return null;

  return (
    <div className="rounded-lg bg-muted/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xl font-semibold">Tier Progress</span>
        <span className="text-muted-foreground">
          <span className="font-semibold text-primary">
            {tierProgress.ratingForNextMajorTier.toFixed()}
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
              <div className="mb-2 text-center font-medium text-muted-foreground">
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
                className="h-1 w-full bg-accent"
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
