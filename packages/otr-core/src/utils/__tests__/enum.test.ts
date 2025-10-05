import { describe, expect, it } from 'bun:test';

import { coerceNumericEnumValue } from '../enum';
import { Ruleset } from '../../osu/enums';

describe('coerceNumericEnumValue', () => {
  it('returns the enum value when the number matches', () => {
    expect(coerceNumericEnumValue(Ruleset, Ruleset.Mania4k)).toBe(
      Ruleset.Mania4k
    );
    expect(coerceNumericEnumValue(Ruleset, 0)).toBe(Ruleset.Osu);
  });

  it('returns undefined when the value is not part of the enum', () => {
    expect(coerceNumericEnumValue(Ruleset, 99)).toBeUndefined();
    expect(coerceNumericEnumValue(Ruleset, NaN)).toBeUndefined();
  });

  it('returns the fallback when the value is invalid', () => {
    expect(coerceNumericEnumValue(Ruleset, 99, Ruleset.Catch)).toBe(
      Ruleset.Catch
    );
    expect(coerceNumericEnumValue(Ruleset, null, Ruleset.Osu)).toBe(Ruleset.Osu);
  });
});
