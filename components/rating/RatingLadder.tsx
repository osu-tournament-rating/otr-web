import React from 'react';
import { cn } from '@/lib/utils';
import TierCard from './TierCard';
import { tierData } from '@/lib/utils/tierData';

interface RatingLadderProps {
  className?: string;
  iconSize?: number;
}

export default function RatingLadder({
  className = '',
  iconSize = 48,
}: RatingLadderProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-2 rounded-2xl p-4 backdrop-blur-sm',
        'border border-white/5',
        'bg-gray-300 dark:bg-card',
        'sm:grid-cols-4 xl:grid-cols-8',
        className
      )}
    >
      {/* All tiers in a responsive grid layout */}
      {tierData.map((item) => (
        <TierCard
          key={item.tier}
          tier={item.tier}
          displayName={item.displayName}
          rating={item.baseRating}
          iconSize={iconSize}
        />
      ))}
    </div>
  );
}
