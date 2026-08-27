import { describe, expect, it } from 'bun:test';

import { formSchema, sameOsuIds } from '@/components/beatmap/BeatmapAdminView';
import type { PlayerLookupResult } from '@/lib/orpc/schema/player';

const player = (osuId: number): PlayerLookupResult => ({
  osuId,
  username: `player ${osuId}`,
  playerId: osuId,
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

describe('difficulty attribute bounds', () => {
  const attributes = ['cs', 'hp', 'od', 'ar'] as const;

  it('accepts 0 through 10 and keeps fractions', () => {
    for (const name of attributes) {
      for (const value of ['0', '4.2', '10']) {
        expect(formSchema.shape[name].safeParse(value).success).toBe(true);
      }
    }
  });

  it('rejects anything outside 0 through 10', () => {
    for (const name of attributes) {
      for (const value of ['10.5', '11', '20', '-1', '']) {
        expect(formSchema.shape[name].safeParse(value).success).toBe(false);
      }
    }
  });

  it('leaves star rating, bpm and the lengths where they were', () => {
    expect(formSchema.shape.sr.safeParse('100').success).toBe(true);
    expect(formSchema.shape.sr.safeParse('101').success).toBe(false);
    expect(formSchema.shape.bpm.safeParse('10000').success).toBe(true);
    expect(formSchema.shape.bpm.safeParse('10001').success).toBe(false);
    expect(formSchema.shape.totalLength.safeParse('3:42').success).toBe(true);
    expect(formSchema.shape.drainLength.safeParse('3:20').success).toBe(true);
  });

  it('takes a stored max combo of zero and an empty one', () => {
    expect(formSchema.shape.maxCombo.safeParse('0').success).toBe(true);
    expect(formSchema.shape.maxCombo.safeParse('').success).toBe(true);
    expect(formSchema.shape.maxCombo.safeParse('-1').success).toBe(false);
  });
});
