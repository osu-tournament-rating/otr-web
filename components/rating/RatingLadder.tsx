import React from 'react';
import { cn } from '@/lib/utils';
import TierCard from './TierCard';

// Tier data for the ladder with simplified names
// Could eventually be fetched from backend
const tierData = [
  {
    tier: 'Elite Grandmaster',
    baseRating: 2500,
    displayName: 'Elite GM',
  },
  {
    tier: 'Grandmaster I',
    baseRating: 1900,
    displayName: 'Grandmaster',
  },
  {
    tier: 'Master I',
    baseRating: 1500,
    displayName: 'Master',
  },
  {
    tier: 'Diamond I',
    baseRating: 1200,
    displayName: 'Diamond',
  },
  {
    tier: 'Platinum I',
    baseRating: 700,
    displayName: 'Platinum',
  },
  {
    tier: 'Gold I',
    baseRating: 500,
    displayName: 'Gold',
  },
  {
    tier: 'Silver I',
    baseRating: 300,
    displayName: 'Silver',
  },
  {
    tier: 'Bronze I',
    baseRating: 100,
    displayName: 'Bronze',
  },
];

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
        'grid grid-cols-2 gap-2 rounded-xl border border-white/5 bg-black/40 p-4 backdrop-blur-sm',
        'sm:grid-cols-4 md:grid-cols-8',
        className
      )}
    >
      {/* All tiers in a responsive grid layout */}
      {tierData.map((item) => (
        <TierCard
          key={item.tier}
          tier={item.tier as keyof typeof import('./TierCard').tierColors}
          displayName={item.displayName}
          rating={item.baseRating}
          iconSize={iconSize}
        />
      ))}
    </div>
  );
}
