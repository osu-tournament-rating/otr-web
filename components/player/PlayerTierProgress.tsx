'use client'

import { getTierString, TierName } from "@/lib/utils/tierData";
import { PlayerRatingStatsDTO } from "@osu-tournament-rating/otr-api-client";
import TierIcon from "../icons/TierIcon";
import TRText from "../rating/TRText";
import { Progress } from "../ui/progress";

interface TierProgressProps {
  tierProgress: PlayerRatingStatsDTO['tierProgress'];
}

export default function PlayerTierProgress({ tierProgress }: TierProgressProps) {
  if (!tierProgress.nextMajorTier) return null;

  return (
    <div className="rounded-lg bg-muted/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xl font-semibold">Tier Progress</span>
        <span className="text-sm text-muted-foreground">
          <span className="font-semibold text-primary">
            {tierProgress.ratingForNextMajorTier.toFixed()}{' '}
          </span>
          <TRText className="-ml-1 text-xs" /> until{' '}
          {getTierString(tierProgress.nextMajorTier as TierName, 3)}
        </span>
      </div>

      <div className="flex">
        <div className="flex h-16 w-16 items-end justify-center">
          <TierIcon
            tier={(tierProgress.currentTier as TierName) || ''}
            subTier={3}
            includeSubtierInTooltip
            width={32}
            height={32}
          />
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
                className="h-1 w-full bg-primary/10"
              />
            </div>
          ))}
        </div>

        <div className="flex h-16 w-16 items-end justify-center">
          <TierIcon
            tier={tierProgress.nextMajorTier as TierName}
            subTier={3}
            includeSubtierInTooltip
            width={32}
            height={32}
          />
        </div>
      </div>
    </div>
  );
}
