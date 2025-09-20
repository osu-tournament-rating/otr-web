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
  if (tier === 'Elite Grandmaster') {
    return 'Elite Grandmaster';
  }

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
  Emerald: {
    gradient: {
      dark: 'from-emerald-500/30 to-emerald-700/10',
      light: 'from-emerald-600/20 to-emerald-800/10',
    },
    textClass: 'text-emerald',
  },
  Silver: {
    gradient: {
      dark: 'from-slate-400/30 to-slate-600/10',
      light: 'from-slate-500/20 to-slate-700/10',
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
    tier: 'Bronze',
    baseRating: 100,
    displayName: 'Bronze',
  },
  {
    tier: 'Silver',
    baseRating: 400,
    displayName: 'Silver',
  },
  {
    tier: 'Gold',
    baseRating: 700,
    displayName: 'Gold',
  },
  {
    tier: 'Platinum',
    baseRating: 1000,
    displayName: 'Platinum',
  },
  {
    tier: 'Emerald',
    baseRating: 1300,
    displayName: 'Emerald',
  },
  {
    tier: 'Diamond',
    baseRating: 1600,
    displayName: 'Diamond',
  },
  {
    tier: 'Master',
    baseRating: 1900,
    displayName: 'Master',
  },
  {
    tier: 'Grandmaster',
    baseRating: 2200,
    displayName: 'Grandmaster',
  },
  {
    tier: 'Elite Grandmaster',
    baseRating: 2500,
    displayName: 'Elite GM',
  },
];

/**
 * Get tier and subtier from a rating value
 */
export function getTierFromRating(rating: number): {
  tier: TierName;
  subTier: number | undefined;
} {
  // Sort tierData by baseRating in descending order to find the highest tier the rating qualifies for
  const sortedTiers = [...tierData].sort((a, b) => b.baseRating - a.baseRating);

  // Find the appropriate tier
  const tierIndex = sortedTiers.findIndex((t) => rating >= t.baseRating);

  if (tierIndex === -1) {
    // Below Bronze
    return { tier: 'Bronze', subTier: 3 };
  }

  const currentTier = sortedTiers[tierIndex];

  // Elite Grandmaster has no subtiers
  if (currentTier.tier === 'Elite Grandmaster') {
    return { tier: 'Elite Grandmaster', subTier: undefined };
  }

  // Calculate the subtier (1, 2, or 3)
  // Get the next tier's base rating
  const nextTierIndex = tierIndex - 1;
  const nextTierRating =
    nextTierIndex >= 0 ? sortedTiers[nextTierIndex].baseRating : rating + 300;

  const tierRange = nextTierRating - currentTier.baseRating;
  const ratingInTier = rating - currentTier.baseRating;
  const subTierSize = tierRange / 3;

  let subTier: number;
  if (ratingInTier < subTierSize) {
    subTier = 3;
  } else if (ratingInTier < subTierSize * 2) {
    subTier = 2;
  } else {
    subTier = 1;
  }

  return { tier: currentTier.tier, subTier };
}
