import { validTiers } from '@/components/icons/TierIcon';

export type TierName = (typeof validTiers)[number];

// Helper function to safely access tier colors
export function getTierColor(tier: string) {
  if (tier in tierColors) {
    return tierColors[tier as keyof typeof tierColors];
  }

  // Return a default tier color if the tier doesn't exist in tierColors
  return tierColors['Silver I'];
}

// Tier colors for glows and accents
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

// Tier data for the ladder with simplified names
export const tierData = [
  {
    tier: 'Elite Grandmaster' as TierName,
    baseRating: 2500,
    displayName: 'Elite GM',
  },
  {
    tier: 'Grandmaster I' as TierName,
    baseRating: 1900,
    displayName: 'Grandmaster',
  },
  {
    tier: 'Master I' as TierName,
    baseRating: 1500,
    displayName: 'Master',
  },
  {
    tier: 'Diamond I' as TierName,
    baseRating: 1200,
    displayName: 'Diamond',
  },
  {
    tier: 'Platinum I' as TierName,
    baseRating: 700,
    displayName: 'Platinum',
  },
  {
    tier: 'Gold I' as TierName,
    baseRating: 500,
    displayName: 'Gold',
  },
  {
    tier: 'Silver I' as TierName,
    baseRating: 300,
    displayName: 'Silver',
  },
  {
    tier: 'Bronze I' as TierName,
    baseRating: 100,
    displayName: 'Bronze',
  },
];
