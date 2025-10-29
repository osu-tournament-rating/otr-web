import { leaderboardTierKeys } from '@/lib/orpc/schema/leaderboard';
import { tierData, type TierName } from '@/lib/utils/tierData';

type LeaderboardTierKey = (typeof leaderboardTierKeys)[number];

const tierKeyOrder: LeaderboardTierKey[] = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'emerald',
  'diamond',
  'master',
  'grandmaster',
  'eliteGrandmaster',
];

const tierKeyToName: Record<LeaderboardTierKey, TierName> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  emerald: 'Emerald',
  diamond: 'Diamond',
  master: 'Master',
  grandmaster: 'Grandmaster',
  eliteGrandmaster: 'Elite Grandmaster',
};

type TierBounds = Record<
  LeaderboardTierKey,
  { min: number; max: number | null }
>;

const SUB_TIERS = 3;

const tierBounds: TierBounds = tierKeyOrder.reduce<TierBounds>(
  (bounds, key, index) => {
    const tierName = tierKeyToName[key];
    const currentTier = tierData.find((tier) => tier.tier === tierName);
    const nextKey = tierKeyOrder[index + 1];

    if (!currentTier) {
      return bounds;
    }

    const nextTier = nextKey
      ? tierData.find((tier) => tier.tier === tierKeyToName[nextKey])
      : undefined;

    bounds[key] = {
      min: key === 'bronze' ? 0 : currentTier.baseRating,
      max: nextTier ? nextTier.baseRating : null,
    };

    return bounds;
  },
  {} as TierBounds
);

export const getTierBounds = (tierKey: LeaderboardTierKey) =>
  tierBounds[tierKey];

export const getTierKeyFromRating = (rating: number): LeaderboardTierKey => {
  for (let index = tierKeyOrder.length - 1; index >= 0; index -= 1) {
    const key = tierKeyOrder[index];
    const bounds = tierBounds[key];

    if (rating >= bounds.min) {
      return key;
    }
  }

  return 'bronze';
};

export const buildTierProgress = (rating: number) => {
  const tierKey = getTierKeyFromRating(rating);
  const tierName = tierKeyToName[tierKey];
  const currentIndex = tierKeyOrder.indexOf(tierKey);
  const currentBounds = tierBounds[tierKey];
  const nextTierKey = tierKeyOrder[currentIndex + 1];
  const nextBounds = nextTierKey ? tierBounds[nextTierKey] : undefined;

  if (!nextTierKey || !nextBounds) {
    return {
      tierKey,
      tierProgress: {
        currentTier: tierName,
        currentSubTier: SUB_TIERS,
        nextTier: null,
        nextSubTier: null,
        ratingForNextTier: rating,
        ratingForNextMajorTier: rating,
        nextMajorTier: null,
        subTierFillPercentage: 1,
        majorTierFillPercentage: 1,
      },
    } as const;
  }

  const majorRange = Math.max(nextBounds.min - currentBounds.min, 1);
  const subTierRange = majorRange / SUB_TIERS;
  const progressInTier = Math.max(0, rating - currentBounds.min);
  const currentSubTier = SUB_TIERS - Math.floor(progressInTier / subTierRange);
  const currentSubTierBase =
    currentBounds.min + subTierRange * (currentSubTier - 1);
  const ratingForNextTier = Math.min(
    nextBounds.min,
    currentSubTierBase + subTierRange
  );
  const nextSubTier = currentSubTier < SUB_TIERS ? currentSubTier + 1 : null;
  const nextMajorTierName = tierKeyToName[nextTierKey];
  const nextTierName = nextSubTier !== null ? tierName : nextMajorTierName;

  const subTierFillPercentage = Math.min(
    1,
    Math.max(0, (rating - currentSubTierBase) / subTierRange)
  );
  const majorTierFillPercentage = Math.min(
    1,
    Math.max(0, progressInTier / majorRange)
  );

  return {
    tierKey,
    tierProgress: {
      currentTier: tierName,
      currentSubTier,
      nextTier: nextTierName,
      nextSubTier,
      ratingForNextTier,
      ratingForNextMajorTier: nextBounds.min,
      nextMajorTier: nextMajorTierName,
      subTierFillPercentage,
      majorTierFillPercentage,
    },
  } as const;
};
