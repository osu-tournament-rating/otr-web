import { describe, expect, test } from 'bun:test';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';
import { Ruleset } from '@otr/core/osu';

import {
  getBeatmapArtist,
  getBeatmapAttributeRows,
  getBeatmapDisplayRuleset,
  getBeatmapRulesetLabel,
  getBeatmapSetOwner,
  getBeatmapTitle,
  isDeletedBeatmap,
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

describe('beatmap metadata precedence', () => {
  const beatmapset = {
    artist: 'Camellia',
    title: 'Ghost',
    creator: { id: 1, username: 'Mapper' },
  };

  test('prefers the admin overrides over the beatmapset', () => {
    const beatmap = {
      artistOverride: 'Cranky',
      titleOverride: 'Kirisame',
      setOwnerOverride: { id: 2, username: 'Owner' },
      beatmapset,
    };

    expect(getBeatmapArtist(beatmap)).toBe('Cranky');
    expect(getBeatmapTitle(beatmap)).toBe('Kirisame');
    expect(getBeatmapSetOwner(beatmap)).toEqual({ id: 2, username: 'Owner' });
  });

  test('falls back to the beatmapset when no override is set', () => {
    const beatmap = {
      artistOverride: null,
      titleOverride: null,
      setOwnerOverride: null,
      beatmapset,
    };

    expect(getBeatmapArtist(beatmap)).toBe('Camellia');
    expect(getBeatmapTitle(beatmap)).toBe('Ghost');
    expect(getBeatmapSetOwner(beatmap)).toEqual({ id: 1, username: 'Mapper' });
  });

  test('reports nothing when neither side has metadata', () => {
    expect(getBeatmapArtist({ beatmapset: null })).toBeNull();
    expect(getBeatmapTitle({ beatmapset: null })).toBeNull();
    expect(getBeatmapSetOwner({ beatmapset: null })).toBeNull();
  });
});

describe('deleted beatmaps', () => {
  test('flags a map osu! no longer serves', () => {
    expect(
      isDeletedBeatmap({
        dataFetchStatus: DataFetchStatus.NotFound,
        manualOverride: false,
      })
    ).toBe(true);
  });

  test('clears the flag once an admin fills the metadata in', () => {
    expect(
      isDeletedBeatmap({
        dataFetchStatus: DataFetchStatus.NotFound,
        manualOverride: true,
      })
    ).toBe(false);
  });

  test('never flags a map the api still serves', () => {
    expect(
      isDeletedBeatmap({
        dataFetchStatus: DataFetchStatus.Fetched,
        manualOverride: false,
      })
    ).toBe(false);
    expect(isDeletedBeatmap({})).toBe(false);
  });
});
