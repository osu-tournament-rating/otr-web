import { describe, expect, test } from 'bun:test';
import { Ruleset } from '@otr/core/osu';

import {
  getBeatmapDisplayRuleset,
  getBeatmapRulesetLabel,
  isManiaRuleset,
} from '../presentation';

describe('beatmap ruleset presentation', () => {
  test('distinguishes tournament mania key modes from difficulty names', () => {
    expect(
      getBeatmapDisplayRuleset(Ruleset.ManiaOther, "Mapper's [4K] Insane")
    ).toBe(Ruleset.Mania4k);
    expect(
      getBeatmapDisplayRuleset(Ruleset.ManiaOther, "Mapper's [7K] Expert")
    ).toBe(Ruleset.Mania7k);
  });

  test('keeps the native ruleset when no key-mode marker is present', () => {
    expect(getBeatmapDisplayRuleset(Ruleset.Taiko, 'Oni')).toBe(Ruleset.Taiko);
    expect(getBeatmapRulesetLabel(Ruleset.Catch, 'Rain')).toBe('osu!catch');
  });

  test('identifies every mania key-mode ruleset', () => {
    expect(isManiaRuleset(Ruleset.ManiaOther)).toBe(true);
    expect(isManiaRuleset(Ruleset.Mania4k)).toBe(true);
    expect(isManiaRuleset(Ruleset.Mania7k)).toBe(true);
    expect(isManiaRuleset(Ruleset.Osu)).toBe(false);
    expect(isManiaRuleset(Ruleset.Taiko)).toBe(false);
    expect(isManiaRuleset(Ruleset.Catch)).toBe(false);
  });
});
