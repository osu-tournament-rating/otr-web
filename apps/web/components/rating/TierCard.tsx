import React from 'react';
import TierIcon from '@/components/icons/TierIcon';
import { cn } from '@/lib/utils';

import { TierName, getTierColor } from '@/lib/utils/tierData';
import { Card } from '../ui/card';

export interface TierCardProps {
  tier: TierName;
  displayName: string;
  rating: number;
  iconSize: number;
  className?: string;
}

export default function TierCard({
  tier,
  displayName,
  rating,
  iconSize,
  className,
}: TierCardProps) {
  const tierColor = getTierColor(tier);
  return (
    <Card
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-2xl border-none bg-popover p-3',
        className
      )}
    >
      <div
        className={cn(
          'absolute inset-0 -z-10 rounded-lg bg-gradient-to-br opacity-40 blur-md',
          tierColor?.gradient.light || '',
          'dark:' + (tierColor?.gradient.dark || '')
        )}
      />

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

      <div className="flex flex-col items-center text-center">
        <span className="text-sm font-semibold">{displayName}</span>
        <span className={cn('text-xs font-semibold', tierColor?.textClass)}>
          {rating}+
        </span>
      </div>
    </Card>
  );
}
