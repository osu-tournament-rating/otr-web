import React from 'react';
import TierIcon from '@/components/icons/TierIcon';
import { cn } from '@/lib/utils';

// Tier colors for glows and accents - with light/dark mode support
export const tierColors = {
  'Elite Grandmaster': {
    gradient: {
      dark: 'from-blue-500/40 to-blue-700/50',
      light: 'from-blue-500/30 to-blue-700/40',
    },
    text: 'text-primary',
  },
  'Grandmaster I': {
    gradient: {
      dark: 'from-red-500/40 to-red-700/50',
      light: 'from-red-500/30 to-red-700/40',
    },
    text: 'text-red-500',
  },
  'Master I': {
    gradient: {
      dark: 'from-purple-400/40 to-purple-600/30',
      light: 'from-purple-400/30 to-purple-600/20',
    },
    text: 'text-purple-600 dark:text-purple-500',
  },
  'Diamond I': {
    gradient: {
      dark: 'from-purple-400/40 to-purple-700/20',
      light: 'from-purple-400/30 to-purple-700/10',
    },
    text: 'text-purple-600 dark:text-purple-400',
  },
  'Platinum I': {
    gradient: {
      dark: 'from-cyan-500/30 to-cyan-700/10',
      light: 'from-cyan-600/20 to-cyan-800/10',
    },
    text: 'text-cyan-600 dark:text-cyan-300',
  },
  'Gold I': {
    gradient: {
      dark: 'from-yellow-500/30 to-yellow-700/10',
      light: 'from-yellow-600/20 to-yellow-800/10',
    },
    text: 'text-yellow-600 dark:text-yellow-400',
  },
  'Silver I': {
    gradient: {
      dark: '',
      light: '',
    },
    text: 'text-slate-500 dark:text-slate-300',
  },
  'Bronze I': {
    gradient: {
      dark: '',
      light: '',
    },
    text: 'text-amber-700 dark:text-amber-600',
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
          tierColors[tier].gradient.light,
          'dark:' + tierColors[tier].gradient.dark
        )}
      />

      {/* Icon container with enhanced glow */}
      <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center">
        <div
          className={cn(
            'absolute inset-0 rounded-full bg-gradient-to-br opacity-60 blur-sm',
            tierColors[tier].gradient.light,
            'dark:' + tierColors[tier].gradient.dark
          )}
        />
        <span className="relative z-10">
          <TierIcon tier={tier} width={iconSize} height={iconSize} />
        </span>
      </div>

      {/* Text content */}
      <div className="flex flex-col items-center text-center">
        <span className="font-semibold">{displayName}</span>
        <span className={cn('text-sm font-semibold', tierColors[tier].text)}>
          {rating}+
        </span>
      </div>
    </div>
  );
}
