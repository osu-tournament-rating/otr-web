import TierIcon from '@/components/icons/TierIcon';
import { Abbreviation } from '@/components/kit/layout/Abbreviation';
import { Tile } from '@/components/kit/layout/Tile';
import { TIER_TEXT_CLASS } from '@/lib/kit/color/tiers';
import { formatRating } from '@/lib/kit/format/number';
import { formatTierName } from '@/lib/kit/format/tier';
import { cn } from '@/lib/utils';
import { type TierName, getTierColor } from '@/lib/utils/tierData';

export interface TierCardProps {
  tier: TierName;
  displayName: string;
  rating: number;
  iconSize: number;
  className?: string;
}

/**
 * One rung of the tier ladder: the tier's icon in its glow, its name and
 * the rating that reaches it, on the kit tile.
 */
export default function TierCard({
  tier,
  displayName,
  rating,
  iconSize,
  className,
}: TierCardProps) {
  // The glow is decoration in the tier's own colours.
  const glow = getTierColor(tier)?.gradient;

  return (
    <Tile
      className={cn(
        'relative isolate flex flex-col items-center gap-2 py-3',
        className
      )}
    >
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 -z-10 bg-gradient-to-br opacity-40 blur-md',
          glow?.light,
          glow?.dark
        )}
      />

      <div className="relative flex size-10 shrink-0 items-center justify-center">
        <div
          aria-hidden
          className={cn(
            'absolute inset-0 rounded-full bg-gradient-to-br opacity-60 blur-sm',
            glow?.light,
            glow?.dark
          )}
        />
        <span className="relative z-10">
          <TierIcon
            tier={tier}
            subTier={tier === 'Elite Grandmaster' ? undefined : 1}
            width={iconSize}
            height={iconSize}
          />
        </span>
      </div>

      <div className="flex flex-col items-center text-center">
        <span className="text-sm font-semibold">
          {/* A shortened name ("Elite GM", to fit the ladder) opens the
              full one on tap, as the tier icon's tooltip names it. */}
          {displayName === formatTierName(tier) ? (
            displayName
          ) : (
            <Abbreviation full={formatTierName(tier)}>
              {displayName}
            </Abbreviation>
          )}
        </span>
        <span
          className={cn(
            'text-xs font-semibold tabular-nums',
            TIER_TEXT_CLASS[tier]
          )}
        >
          {formatRating(rating)}+
        </span>
      </div>
    </Tile>
  );
}
