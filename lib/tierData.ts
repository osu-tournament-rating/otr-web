/**
 * String representation of each tier and subtier. There are three subtiers per major tier,
 * except for Elite Grandmaster.
 */
export const tierNames = [
  'Bronze III',
  'Bronze II',
  'Bronze I',
  'Silver III',
  'Silver II',
  'Silver I',
  'Gold III',
  'Gold II',
  'Gold I',
  'Emerald III',
  'Emerald II',
  'Emerald I',
  'Platinum III',
  'Platinum II',
  'Platinum I',
  'Diamond III',
  'Diamond II',
  'Diamond I',
  'Master III',
  'Master II',
  'Master I',
  'Grandmaster III',
  'Grandmaster II',
  'Grandmaster I',
  'Elite Grandmaster',
] as const;

/**
 * Typed representation of each possible tier name
 */
export type TierName = (typeof tierNames)[number];

/**
 * Helper function to safely access tier colors
 * @param tierName Tier name
 * @returns Tier color
 */
export function getTierColor(tierName: TierName): TierColor {
  if (tierName in tierColors) {
    return tierColors[tierName]!;
  }

  // Return a default tier color if the tier doesn't exist in tierColors
  return tierColors['Silver I']!;
}

/**
 * Colors and gradients for a tier
 */
export type TierColor = {
  /** Gradient coloring, displays as a glow around the tier icon. Format is from-color-000 to-color-000 */
  gradient: {
    /** Dark mode gradient */
    dark: string;

    /** Light mode gradient */
    light: string;
  };

  /** Class name for the primary color of the icon */
  textClass: string;
};

/** Tier colors for glows and accents */
export const tierColors: Partial<{ [key in TierName]: TierColor }> = {
  'Elite Grandmaster': {
    gradient: {
      dark: 'from-blue-500/40 to-blue-700/50',
      light: 'from-blue-500/30 to-blue-700/40',
    },
    textClass: 'text-elite-grandmaster',
  },
  'Grandmaster I': {
    gradient: {
      dark: 'from-red-500/40 to-red-700/50',
      light: 'from-red-500/30 to-red-700/40',
    },
    textClass: 'text-grandmaster',
  },
  'Master I': {
    gradient: {
      dark: 'from-purple-400/40 to-purple-600/30',
      light: 'from-purple-400/30 to-purple-600/20',
    },
    textClass: 'text-master',
  },
  'Diamond I': {
    gradient: {
      dark: 'from-purple-400/40 to-purple-700/20',
      light: 'from-purple-400/30 to-purple-700/10',
    },
    textClass: 'text-diamond',
  },
  'Emerald I': {
    gradient: {
      dark: 'from-green-500/40 to-green-700/50',
      light: 'from-green-500/30 to-green-700/40',
    },
    textClass: 'text-emerald',
  },
  'Platinum I': {
    gradient: {
      dark: 'from-cyan-500/30 to-cyan-700/10',
      light: 'from-cyan-600/20 to-cyan-800/10',
    },
    textClass: 'text-platinum',
  },
  'Gold I': {
    gradient: {
      dark: 'from-yellow-500/30 to-yellow-700/10',
      light: 'from-yellow-600/20 to-yellow-800/10',
    },
    textClass: 'text-gold',
  },
  'Silver I': {
    gradient: {
      dark: '',
      light: '',
    },
    textClass: 'text-silver',
  },
  'Bronze I': {
    gradient: {
      dark: '',
      light: '',
    },
    textClass: 'text-bronze',
  },
};

/** Basic information about a tier */
export type TierDataType = {
  /** Tier name */
  tier: TierName;

  /** Minimum rating required to achieve the tier */
  baseRating: number;

  /** How the tier text is displayed visually */
  displayName: string;
}

/** Tier data for the ladder with simplified names */
export const tierData: TierDataType[] = [
  {
    tier: 'Bronze I',
    baseRating: 100,
    displayName: 'Bronze',
  },
  {
    tier: 'Silver I',
    baseRating: 300,
    displayName: 'Silver',
  },
  {
    tier: 'Gold I',
    baseRating: 500,
    displayName: 'Gold',
  },
  {
    tier: 'Platinum I',
    baseRating: 700,
    displayName: 'Platinum',
  },
  {
    tier: 'Emerald I',
    baseRating: 900,
    displayName: 'Emerald',
  },
  {
    tier: 'Diamond I',
    baseRating: 1200,
    displayName: 'Diamond',
  },
  {
    tier: 'Master I',
    baseRating: 1500,
    displayName: 'Master',
  },
  {
    tier: 'Grandmaster I',
    baseRating: 1900,
    displayName: 'Grandmaster',
  },
  {
    tier: 'Elite Grandmaster',
    baseRating: 2500,
    displayName: 'Elite GM',
  },
];
