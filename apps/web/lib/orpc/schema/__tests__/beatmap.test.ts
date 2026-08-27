import { describe, expect, test } from 'bun:test';

import { BeatmapAdminUpdateInputSchema } from '../beatmap';

const input = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  diffName: 'Difficulty',
  ruleset: 0,
  rankedStatus: 1,
  totalLength: 120,
  drainLength: 110,
  bpm: 180,
  countCircle: 300,
  countSlider: 200,
  countSpinner: 2,
  cs: 4,
  hp: 6,
  od: 8,
  ar: 9,
  sr: 5.5,
  maxCombo: 800,
  titleOverride: null,
  artistOverride: null,
  setOwnerOsuIdOverride: null,
  creatorOsuIds: [],
  ...overrides,
});

const parse = (overrides: Record<string, unknown> = {}) =>
  BeatmapAdminUpdateInputSchema.safeParse(input(overrides)).success;

describe('BeatmapAdminUpdateInputSchema', () => {
  test('accepts a full payload', () => {
    expect(parse()).toBe(true);
  });

  test('takes an unknown max combo as null, never 0', () => {
    expect(parse({ maxCombo: null })).toBe(true);
    expect(parse({ maxCombo: 1 })).toBe(true);
    expect(parse({ maxCombo: 0 })).toBe(false);
    expect(parse({ maxCombo: -1 })).toBe(false);
  });

  test('caps cs at 10 and keeps fractions', () => {
    expect(parse({ cs: 0 })).toBe(true);
    expect(parse({ cs: 4.2 })).toBe(true);
    expect(parse({ cs: 10 })).toBe(true);
    expect(parse({ cs: 10.5 })).toBe(false);
    expect(parse({ cs: 11 })).toBe(false);
    expect(parse({ cs: -0.1 })).toBe(false);
  });

  test('keeps hp, od and ar at 20', () => {
    expect(parse({ hp: 20, od: 20, ar: 20 })).toBe(true);
    expect(parse({ hp: 20.5 })).toBe(false);
  });

  test('bounds integer columns to the postgres range', () => {
    expect(parse({ countCircle: 2_147_483_647 })).toBe(true);
    expect(parse({ countCircle: 2_147_483_648 })).toBe(false);
    expect(parse({ countSlider: 2_147_483_648 })).toBe(false);
    expect(parse({ countSpinner: 2_147_483_648 })).toBe(false);
    expect(parse({ maxCombo: 2_147_483_648 })).toBe(false);
    expect(parse({ id: 2_147_483_648 })).toBe(false);
  });

  test('rejects a ruleset outside the enum', () => {
    expect(parse({ ruleset: 5 })).toBe(true);
    expect(parse({ ruleset: 6 })).toBe(false);
    expect(parse({ ruleset: '0' })).toBe(false);
  });
});
