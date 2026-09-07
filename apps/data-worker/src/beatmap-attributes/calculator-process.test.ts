import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { normalizeCalculationSettings } from '@otr/core/osu/beatmap-attributes';
import { calculateInProcess } from './calculator-process';

const bytes = readFileSync(
  new URL('./calculator-fixtures/2785319.osu', import.meta.url)
);

describe('isolated calculator process', () => {
  test('returns canonical compact results from the released library', async () => {
    const batch = await calculateInProcess(
      bytes,
      [0, 16, 64, 512, 576].map((mods) =>
        normalizeCalculationSettings({ ruleset: 0, mods, lazer: false })
      )
    );
    expect(batch.sourceMode).toBe(0);
    expect(batch.keyCount).toBeNull();
    expect(batch.results).toHaveLength(3);
    for (const { settings, attributes } of batch.results) {
      expect(settings.lazer).toBe(false);
      expect(attributes.sr).toBeGreaterThan(0);
      expect(attributes.difficulty.version).toBe(2);
      expect(attributes).not.toHaveProperty('totalLength');
      expect(attributes).not.toHaveProperty('drainLength');
    }
  });

  test('returns a terminal error for invalid source content', async () => {
    await expect(
      calculateInProcess(new TextEncoder().encode('<html>not a map</html>'), [
        normalizeCalculationSettings({ ruleset: 0, mods: 0, lazer: false }),
      ])
    ).rejects.toMatchObject({
      code: 'invalid_beatmap_calculation',
      retryable: false,
    });
  });
});
