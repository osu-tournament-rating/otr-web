import React from 'react';
import TierIcon from '@/components/icons/TierIcon';
import { cn } from '@/lib/utils';
import { TierName, getTierColor } from '@/lib/tierData';

export interface TierCardProps {
  tier: TierName;
  displayName: string;
  rating: number;
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
        'relative flex flex-col items-center gap-2 rounded-2xl p-3 transition-all duration-200',
        'bg-gray-800/60 hover:bg-gray-800/95 dark:bg-card-alt/80 dark:hover:bg-card-alt/10',
        'border border-white/5 hover:border-white/10',
        'shadow-lg hover:shadow-xl',
        className
      )}
    >
      {/* Enhanced glow effect based on tier color */}
      <div
        className={cn(
          'absolute inset-0 -z-10 rounded-lg bg-gradient-to-br opacity-40 blur-md',
          tierColor.gradient.light || '',
          'dark:' + (tierColor.gradient.dark || '')
        )}
      />

      {/* Icon container with enhanced glow */}
      <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center">
        <div
          className={cn(
            'absolute inset-0 rounded-full bg-gradient-to-br opacity-60 blur-sm',
            tierColor.gradient.light || '',
            'dark:' + (tierColor.gradient.dark || '')
          )}
        />
        <span className="relative z-10">
          <TierIcon tier={tier} width={iconSize} height={iconSize} />
        </span>
      </div>

      {/* Text content */}
      <div className="flex flex-col items-center text-center">
        <span className="font-semibold">{displayName}</span>
        <span className={cn('text-sm font-semibold', tierColor.text || '')}>
          {rating}+
        </span>
      </div>
    </div>
  );
}
