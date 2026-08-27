import { zodResolver } from '@hookform/resolvers/zod';
import { ORPCError } from '@orpc/client';
import { describe, expect, it } from 'bun:test';

import {
  fieldErrors,
  formSchema,
  sameOsuIds,
} from '@/components/beatmap/BeatmapAdminView';
import type { PlayerLookupResult } from '@/lib/orpc/schema/player';

const player = (osuId: number): PlayerLookupResult => ({
  osuId,
  username: `player ${osuId}`,
  playerId: osuId,
});

const filled = {
  diffName: 'Insane',
  ruleset: '0',
  sr: '6.12',
  bpm: '180',
  totalLength: '1:12:15',
  drainLength: '1:10:02',
  cs: '4',
  hp: '6',
  od: '9',
  ar: '9.3',
  countCircle: '1200',
  countSlider: '600',
  countSpinner: '3',
  maxCombo: '',
  titleOverride: 'Title',
  artistOverride: 'Artist',
};

const resolve = (overrides: Partial<typeof filled> = {}) =>
  zodResolver(formSchema)({ ...filled, ...overrides }, undefined, {
    fields: {},
    shouldUseNativeValidation: false,
  });

describe('formSchema through the form resolver', () => {
  it('accepts a filled form', async () => {
    const { errors, values } = await resolve();

    expect(errors).toEqual({});
    expect(values).toMatchObject({ totalLength: '1:12:15' });
  });

  it('reports a cleared required field instead of throwing', async () => {
    const { errors, values } = await resolve({ countCircle: '' });

    expect(errors.countCircle?.message).toBe('Required');
    expect(values).toEqual({});
  });

  it('caps CS at 10 and keeps it fractional', async () => {
    expect((await resolve({ cs: '4.2' })).errors).toEqual({});
    expect((await resolve({ cs: '10' })).errors).toEqual({});

    for (const cs of ['10.5', '11', '-1']) {
      expect((await resolve({ cs })).errors.cs?.message).toBe(
        'Enter a number from 0 to 10'
      );
    }
  });

  it('takes an empty max combo but not zero', async () => {
    expect((await resolve({ maxCombo: '' })).errors).toEqual({});
    expect((await resolve({ maxCombo: '600' })).errors).toEqual({});
    expect((await resolve({ maxCombo: '0' })).errors.maxCombo?.message).toBe(
      'Enter a whole number, 1 or more'
    );
  });
});

describe('fieldErrors', () => {
  it('reads server issues that name a form field', () => {
    const error = new ORPCError('BAD_REQUEST', {
      data: {
        issues: [
          { message: 'Too big', path: ['cs'] },
          { message: 'Too big', path: [{ key: 'ar' }] },
          { message: 'Unknown', path: ['creatorOsuIds', 0] },
          { message: 'Nowhere', path: [] },
        ],
      },
    });

    expect(fieldErrors(error)).toEqual([
      { name: 'cs', message: 'Too big' },
      { name: 'ar', message: 'Too big' },
    ]);
  });

  it('reads nothing from anything else', () => {
    expect(fieldErrors(new Error('offline'))).toEqual([]);
    expect(fieldErrors(new ORPCError('INTERNAL_SERVER_ERROR'))).toEqual([]);
  });
});

describe('sameOsuIds', () => {
  it('treats identical selections as unchanged', () => {
    expect(sameOsuIds([], [])).toBe(true);
    expect(sameOsuIds([player(1), player(2)], [player(1), player(2)])).toBe(
      true
    );
  });

  it('ignores everything but the osu! id', () => {
    expect(
      sameOsuIds([player(1)], [{ osuId: 1, username: 'renamed', playerId: 9 }])
    ).toBe(true);
  });

  it('detects additions, removals, and reordering', () => {
    expect(sameOsuIds([player(1)], [player(1), player(2)])).toBe(false);
    expect(sameOsuIds([player(1), player(2)], [player(1)])).toBe(false);
    expect(sameOsuIds([player(1), player(2)], [player(2), player(1)])).toBe(
      false
    );
  });
});
