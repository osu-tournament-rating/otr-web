import React from 'react';
import TierIcon from '@/components/icons/TierIcon';
import { cn } from '@/lib/utils';

// Rating constants from backend
const RATING_CONSTANTS = {
  // Bronze: 100 - 299
  BRONZE_III: 100,
  BRONZE_II: 165,
  BRONZE_I: 235,

  // Silver: 300 - 499
  SILVER_III: 300,
  SILVER_II: 365,
  SILVER_I: 430,

  // Gold: 500 - 699
  GOLD_III: 500,
  GOLD_II: 570,
  GOLD_I: 625,

  // Platinum: 700 - 899
  PLATINUM_III: 700,
  PLATINUM_II: 770,
  PLATINUM_I: 825,

  // Emerald: 900 - 1199
  EMERALD_III: 900,
  EMERALD_II: 1000,
  EMERALD_I: 1100,

  // Diamond: 1200 - 1499
  DIAMOND_III: 1200,
  DIAMOND_II: 1300,
  DIAMOND_I: 1400,

  // Master: 1500 - 1899
  MASTER_III: 1500,
  MASTER_II: 1625,
  MASTER_I: 1750,

  // Grandmaster: 1900 - 2499
  GRANDMASTER_III: 1900,
  GRANDMASTER_II: 2100,
  GRANDMASTER_I: 2300,

  // Elite Grandmaster: 2500+
  ELITE_GRANDMASTER: 2500,
};

// Tier colors for glows and accents
const tierColors = {
  'Elite Grandmaster': {
    gradient: 'from-purple-500/30 to-purple-700/10',
    text: 'text-purple-400',
    chevron: 'from-purple-300 to-purple-600',
  },
  'Grandmaster I': {
    gradient: 'from-red-500/30 to-red-700/10',
    text: 'text-red-400',
    chevron: 'from-red-300 to-red-600',
  },
  'Master I': {
    gradient: 'from-fuchsia-500/30 to-fuchsia-700/10',
    text: 'text-fuchsia-400',
    chevron: 'from-fuchsia-300 to-fuchsia-600',
  },
  'Diamond I': {
    gradient: 'from-cyan-500/30 to-cyan-700/10',
    text: 'text-cyan-400',
    chevron: 'from-cyan-300 to-cyan-600',
  },
  'Platinum I': {
    gradient: 'from-blue-500/30 to-blue-700/10',
    text: 'text-blue-400',
    chevron: 'from-blue-300 to-blue-600',
  },
  'Gold I': {
    gradient: 'from-yellow-500/30 to-yellow-700/10',
    text: 'text-yellow-400',
    chevron: 'from-yellow-300 to-yellow-600',
  },
  'Silver I': {
    gradient: 'from-slate-400/30 to-slate-600/10',
    text: 'text-slate-400',
    chevron: 'from-slate-300 to-slate-500',
  },
  'Bronze I': {
    gradient: 'from-amber-500/30 to-amber-700/10',
    text: 'text-amber-400',
    chevron: 'from-amber-300 to-amber-600',
  },
};

// Tier data for the ladder with simplified names
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

// Split the data into two columns
const leftColumn = tierData.slice(0, 4);
const rightColumn = tierData.slice(4);

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
        'grid grid-cols-8 gap-2 rounded-xl border border-white/5 bg-black/40 p-4 backdrop-blur-sm',
        className
      )}
    >
      {/* All tiers in a horizontal layout */}
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

// Individual tier card component
function TierCard({
  tier,
  displayName,
  rating,
  iconSize,
}: {
  tier: keyof typeof tierColors;
  displayName: string;
  rating: number;
  iconSize: number;
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-lg p-3 transition-all',
        'bg-gradient-to-b from-black/60 to-black/80 hover:from-black/70 hover:to-black/90',
        'border border-white/5 hover:border-white/10',
        'shadow-lg hover:shadow-xl'
      )}
    >
      {/* Glow effect based on tier color */}
      <div
        className={cn(
          'absolute inset-0 -z-10 rounded-lg bg-gradient-to-br opacity-20 blur-md',
          tierColors[tier].gradient
        )}
      />

      {/* Icon container with subtle glow */}
      <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center">
        <div
          className={cn(
            'absolute inset-0 rounded-full bg-gradient-to-br opacity-30 blur-sm',
            tierColors[tier].gradient
          )}
        />
        <TierIcon tier={tier} width={iconSize} height={iconSize} />
      </div>

      {/* Text content */}
      <div className="flex flex-col items-center text-center">
        <span className="font-semibold text-white">{displayName}</span>
        <span className={cn('text-sm font-medium', tierColors[tier].text)}>
          {rating}+
        </span>
      </div>
    </div>
  );
}
