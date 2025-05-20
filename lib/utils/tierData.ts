/**
 * String representation of each tier and subtier. There are three subtiers per major tier,
 * except for Elite Grandmaster.
 */
export const tierNames = [
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Emerald',
  'Diamond',
  'Master',
  'Grandmaster',
  'Elite Grandmaster',
] as const;

/**
 * Typed representation of each possible tier name
 */
export type TierName = (typeof tierNames)[number];

export function getTierString(tier: TierName, subTier: number | undefined) {
  const romanNumeral = (() => {
    switch (subTier) {
      case 1:
        return 'I';
      case 2:
        return 'II';
      case 3:
        return 'III';
      default:
        return '';
    }
  })();

  if (romanNumeral === '') {
    return tier.toString();
  }

  return `${tier} ${romanNumeral}`;
}

// Helper function to safely access tier colors
export function getTierColor(tier: TierName) {
  if (tier in tierColors) {
    return tierColors[tier];
  }

  // Return a default tier color if the tier doesn't exist in tierColors
  return tierColors['Silver'];
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
  Grandmaster: {
    gradient: {
      dark: 'from-red-500/40 to-red-700/50',
      light: 'from-red-500/30 to-red-700/40',
    },
    textClass: 'text-grandmaster',
  },
  Master: {
    gradient: {
      dark: 'from-purple-400/40 to-purple-600/30',
      light: 'from-purple-400/30 to-purple-600/20',
    },
    textClass: 'text-master',
  },
  Diamond: {
    gradient: {
      dark: 'from-purple-400/40 to-purple-700/20',
      light: 'from-purple-400/30 to-purple-700/10',
    },
    textClass: 'text-diamond',
  },
  Platinum: {
    gradient: {
      dark: 'from-cyan-500/30 to-cyan-700/10',
      light: 'from-cyan-600/20 to-cyan-800/10',
    },
    textClass: 'text-platinum',
  },
  Gold: {
    gradient: {
      dark: 'from-yellow-500/30 to-yellow-700/10',
      light: 'from-yellow-600/20 to-yellow-800/10',
    },
    textClass: 'text-gold',
  },
  Silver: {
    gradient: {
      dark: '',
      light: '',
    },
    textClass: 'text-silver',
  },
  Bronze: {
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
};

/** Tier data for the ladder with simplified names */
export const tierData: TierDataType[] = [
  {
    tier: 'Grandmaster',
    baseRating: 1900,
    displayName: 'Grandmaster',
  },
  {
    tier: 'Master',
    baseRating: 1500,
    displayName: 'Master',
  },
  {
    tier: 'Diamond',
    baseRating: 1200,
    displayName: 'Diamond',
  },
  {
    tier: 'Emerald',
    baseRating: 900,
    displayName: 'Emerald',
  },
  {
    tier: 'Platinum',
    baseRating: 700,
    displayName: 'Platinum',
  },
  {
    tier: 'Gold',
    baseRating: 500,
    displayName: 'Gold',
  },
  {
    tier: 'Silver',
    baseRating: 300,
    displayName: 'Silver',
  },
  {
    tier: 'Bronze',
    baseRating: 100,
    displayName: 'Bronze',
  },
];
