import { describe, expect, test } from 'bun:test';

import { buildTierProgress } from '@/lib/utils/tierProgress';

// Emerald spans 1300 to 1600, so each sub-tier band is 100 TR wide:
// III is 1300 to 1400, II is 1400 to 1500, I is 1500 to 1600.
describe('buildTierProgress', () => {
  test('sub-tier III targets sub-tier II of the same tier', () => {
    const { tierProgress } = buildTierProgress(1350);

    expect(tierProgress).toMatchObject({
      currentTier: 'Emerald',
      currentSubTier: 3,
      nextTier: 'Emerald',
      nextSubTier: 2,
      ratingForNextTier: 1400,
      nextMajorTier: 'Diamond',
      ratingForNextMajorTier: 1600,
    });
    expect(tierProgress.subTierFillPercentage).toBeCloseTo(0.5);
  });

  test('sub-tier II targets sub-tier I of the same tier', () => {
    const { tierProgress } = buildTierProgress(1450);

    expect(tierProgress).toMatchObject({
      currentTier: 'Emerald',
      currentSubTier: 2,
      nextTier: 'Emerald',
      nextSubTier: 1,
      ratingForNextTier: 1500,
    });
    expect(tierProgress.subTierFillPercentage).toBeCloseTo(0.5);
  });

  test('sub-tier I targets the next major tier', () => {
    const { tierProgress } = buildTierProgress(1550);

    expect(tierProgress).toMatchObject({
      currentTier: 'Emerald',
      currentSubTier: 1,
      nextTier: 'Diamond',
      nextSubTier: null,
      ratingForNextTier: 1600,
    });
    expect(tierProgress.subTierFillPercentage).toBeCloseTo(0.5);
  });

  test('the top of sub-tier I stays below the next major tier', () => {
    const { tierProgress } = buildTierProgress(1599.9);

    expect(tierProgress.currentSubTier).toBe(1);
    expect(tierProgress.ratingForNextTier).toBe(1600);
    expect(tierProgress.subTierFillPercentage).toBeLessThan(1);
  });

  test('bronze bands start at the bronze base rating', () => {
    expect(buildTierProgress(150).tierProgress).toMatchObject({
      currentTier: 'Bronze',
      currentSubTier: 3,
      nextSubTier: 2,
      ratingForNextTier: 200,
    });
    expect(buildTierProgress(250).tierProgress).toMatchObject({
      currentSubTier: 2,
      ratingForNextTier: 300,
    });
    expect(buildTierProgress(50).tierProgress).toMatchObject({
      currentSubTier: 3,
      ratingForNextTier: 200,
      subTierFillPercentage: 0,
      majorTierFillPercentage: 0,
    });
  });

  test('elite grandmaster has no next tier', () => {
    const { tierProgress } = buildTierProgress(2600);

    expect(tierProgress).toMatchObject({
      currentTier: 'Elite Grandmaster',
      nextTier: null,
      nextSubTier: null,
      nextMajorTier: null,
      subTierFillPercentage: 1,
    });
  });
});
