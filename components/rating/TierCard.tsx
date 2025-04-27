import React from 'react';
import TierIcon from '@/components/icons/TierIcon';
import { cn } from '@/lib/utils';
import { TierName, getTierColor } from '@/lib/utils/tierData';

export interface TierCardProps {
  /** Desired tier */
  tier: TierName;

  /** Visual text representation of the tier */
  displayName: string;

  /** Tier rating */
  rating: number;

  /** Icon size */
  iconSize: number;

  className?: string;
}

// Individual tier card component
export default function TierCard({
  tier,
  displayName,
  rating,
  iconSize,
  className,
}: TierCardProps) {
  const tierColor = getTierColor(tier);
  return (
    <div
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-2xl border border-white/5 bg-gray-800/60 p-3 dark:bg-card-alt/80',
        className
      )}
    >
      {/* Enhanced glow effect based on tier color */}
      <div
        className={cn(
          'absolute inset-0 -z-10 rounded-lg bg-gradient-to-br opacity-40 blur-md',
          tierColor?.gradient.light || '',
          'dark:' + (tierColor?.gradient.dark || '')
        )}
      />

      {/* Icon container with enhanced glow */}
      <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center">
        <div
          className={cn(
            'absolute inset-0 rounded-full bg-gradient-to-br opacity-60 blur-sm',
            tierColor?.gradient.light || '',
            'dark:' + (tierColor?.gradient.dark || '')
          )}
        />
        <span className="relative z-10">
          <TierIcon
            tier={tier}
            subTier={tier === 'Elite Grandmaster' ? undefined : 1}
            width={iconSize}
            height={iconSize}
            tooltip={false}
          />
        </span>
      </div>

      {/* Text content */}
      <div className="flex flex-col items-center text-center">
        <span className="text-sm font-semibold">{displayName}</span>
        <span className={cn('text-xs font-semibold', tierColor?.textClass)}>
          {rating}+
        </span>
      </div>
    </div>
  );
}
