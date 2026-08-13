import { describe, expect, test } from 'bun:test';
import { Ruleset } from '@otr/core/osu';

import {
  getBeatmapAttributeRows,
  getBeatmapDisplayRuleset,
  getBeatmapRulesetLabel,
  isDeletedTournamentBeatmap,
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

describe('beatmap attribute rows', () => {
  test('keeps every osu! attribute gauged and unmuted', () => {
    const rows = getBeatmapAttributeRows(Ruleset.Osu);

    expect(rows.map((row) => row.abbreviation)).toEqual([
      'CS',
      'AR',
      'OD',
      'HP',
    ]);
    expect(rows.map((row) => row.key)).toEqual(['cs', 'ar', 'od', 'hp']);
    expect(rows.every((row) => !row.muted)).toBe(true);
    expect(rows.every((row) => row.gauge !== false)).toBe(true);
    expect(rows.every((row) => !row.integer)).toBe(true);
  });

  test('leads taiko with OD and HP, muting the gauge-less CS and AR', () => {
    const rows = getBeatmapAttributeRows(Ruleset.Taiko);

    expect(rows.map((row) => row.abbreviation)).toEqual([
      'OD',
      'HP',
      'CS',
      'AR',
    ]);
    expect(rows.slice(0, 2).every((row) => !row.muted)).toBe(true);
    expect(rows.slice(2)).toEqual([
      {
        abbreviation: 'CS',
        label: 'Circle size',
        key: 'cs',
        muted: true,
        gauge: false,
      },
      {
        abbreviation: 'AR',
        label: 'Approach rate',
        key: 'ar',
        muted: true,
        gauge: false,
      },
    ]);
  });

  test('leads catch with AR and CS, muting only OD', () => {
    const rows = getBeatmapAttributeRows(Ruleset.Catch);

    expect(rows.map((row) => row.abbreviation)).toEqual([
      'AR',
      'CS',
      'HP',
      'OD',
    ]);
    expect(rows.slice(0, 3).every((row) => !row.muted)).toBe(true);
    expect(rows[3]).toEqual({
      abbreviation: 'OD',
      label: 'Overall difficulty',
      key: 'od',
      muted: true,
      gauge: false,
    });
  });

  test.each([Ruleset.ManiaOther, Ruleset.Mania4k, Ruleset.Mania7k])(
    'renders mania ruleset %p as an integer key count with a muted AR',
    (ruleset) => {
      const rows = getBeatmapAttributeRows(ruleset);

      expect(rows.map((row) => row.abbreviation)).toEqual([
        'Keys',
        'OD',
        'HP',
        'AR',
      ]);
      expect(rows[0]).toEqual({
        abbreviation: 'Keys',
        label: 'Key count',
        key: 'cs',
        gauge: false,
        integer: true,
      });
      expect(rows[1]?.muted).toBeUndefined();
      expect(rows[2]?.muted).toBeUndefined();
      expect(rows[3]).toEqual({
        abbreviation: 'AR',
        label: 'Approach rate',
        key: 'ar',
        muted: true,
        gauge: false,
      });
    }
  );
});

describe('deleted tournament beatmaps', () => {
  test('flags a map whose set never came back from osu!', () => {
    expect(isDeletedTournamentBeatmap({})).toBe(true);
    expect(isDeletedTournamentBeatmap({ beatmapset: null })).toBe(true);
    expect(isDeletedTournamentBeatmap({ beatmapset: { artist: '' } })).toBe(
      true
    );
    expect(
      isDeletedTournamentBeatmap({ beatmapset: { artist: '', title: '' } })
    ).toBe(true);
  });

  test('keeps a map that is genuinely titled after the fallback strings', () => {
    expect(
      isDeletedTournamentBeatmap({
        beatmapset: { artist: 'Camellia', title: 'Unknown Title' },
      })
    ).toBe(false);
  });

  test('keeps a map with only one half of its metadata', () => {
    expect(
      isDeletedTournamentBeatmap({ beatmapset: { title: 'Blue Zenith' } })
    ).toBe(false);
  });
});
