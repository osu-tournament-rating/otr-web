import { describe, expect, it } from 'bun:test';

import { sameOsuIds } from '@/components/beatmap/BeatmapAdminView';
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
