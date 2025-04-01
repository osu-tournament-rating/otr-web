import React from 'react';
import TierIcon from '@/components/icons/TierIcon';
import { cn } from '@/lib/utils';

// Tier colors for glows and accents - updated to match the actual colors from the image
export const tierColors = {
  'Elite Grandmaster': {
    gradient: 'from-blue-500/40 to-blue-700/50',
    text: 'text-primary',
  },
  'Grandmaster I': {
    gradient: 'from-red-500/40 to-red-700/50',
    text: 'text-red-500',
  },
  'Master I': {
    gradient: 'from-purple-400/40 to-purple-600/30',
    text: 'text-purple-600',
  },
  'Diamond I': {
    gradient: 'from-purple-400/40 to-purple-700/20',
    text: 'text-purple-400',
  },
  'Platinum I': {
    gradient: 'from-cyan-500/30 to-cyan-700/10',
    text: 'text-cyan-300',
  },
  'Gold I': {
    gradient: 'from-yellow-500/30 to-yellow-700/10',
    text: 'text-yellow-400',
  },
  'Silver I': {
    gradient: '',
    text: 'text-slate-300',
  },
  'Bronze I': {
    gradient: '',
    text: 'text-amber-600',
  },
};

export interface TierCardProps {
  tier: keyof typeof tierColors;
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
  return (
    <div
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-2xl p-3 transition-all',
        'bg-gradient-to-b from-black/60 to-black/80 hover:from-black/70 hover:to-black/90',
        'border border-white/5 hover:border-white/10',
        'shadow-lg hover:shadow-xl',
        className
      )}
    >
      {/* Enhanced glow effect based on tier color */}
      <div
        className={cn(
          'absolute inset-0 -z-10 rounded-lg bg-gradient-to-br opacity-40 blur-md',
          tierColors[tier].gradient
        )}
      />

      {/* Icon container with enhanced glow */}
      <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center">
        <div
          className={cn(
            'absolute inset-0 rounded-full bg-gradient-to-br opacity-60 blur-sm',
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
