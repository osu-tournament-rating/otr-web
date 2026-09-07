import { describe, expect, it } from 'bun:test';
import { getTableConfig } from 'drizzle-orm/pg-core';

import {
  BeatmapDifficultyPayloadSchema,
  CalculatedBeatmapAttributesSchema,
  CalculationSettingsSchema,
  createCalculationIdentity,
  getDefaultCalculationSettings,
  normalizeCalculationRequests,
  normalizeCalculationSettings,
} from '../beatmap-attributes';
import { Mods, Ruleset } from '../enums';
import {
  beatmapAttributes,
  beatmapAttributeJobs,
  beatmapFiles,
} from '../../db/schema';

const input = { ruleset: Ruleset.Osu, mods: Mods.DoubleTime, lazer: false };
const version = {
  checksum: 'a'.repeat(64),
  calculatorVersion: 'rosu-pp-js@4.0.1+duration@1.0.0',
  formatVersion: 1,
};
const maniaResult = {
  ar: null,
  od: 11.125,
  cs: null,
  hpDrain: 8.4,
  sr: 3.125,
  bpm: 180.25,
  maxCombo: 4,
  clockRate: 1.5,
  totalLength: 5.75,
  drainLength: 4.25,
  hitWindows: {
    ar: null,
    odPerfect: 16,
    odGreat: 31.5,
    odGood: 64,
    odOk: 97,
    odMeh: 121,
  },
  difficulty: {
    version: 1,
    mode: 3,
    isConvert: false,
    keyCount: 4,
    attributes: {
      mode: 3,
      stars: 3.125,
      isConvert: false,
      maxCombo: 4,
      nObjects: 4,
      nHoldNotes: 1,
    },
  },
};

describe('beatmap calculation contracts', () => {
  it('canonicalizes DT, NC and NC with DT to one effective calculation', () => {
    const requests = [
      Mods.DoubleTime,
      Mods.Nightcore,
      Mods.Nightcore | Mods.DoubleTime,
    ].map((mods) =>
      normalizeCalculationSettings({ ruleset: Ruleset.Osu, mods, lazer: false })
    );
    expect(requests).toEqual(
      Array.from({ length: 3 }, () => ({
        ruleset: Ruleset.Osu,
        mode: 0,
        mods: Mods.DoubleTime,
        clockRate: 1.5,
        lazer: false,
      }))
    );
  });

  it('maps o!TR mania distinctions to the library mania mode', () => {
    for (const ruleset of [
      Ruleset.ManiaOther,
      Ruleset.Mania4k,
      Ruleset.Mania7k,
    ]) {
      expect(
        normalizeCalculationSettings({ ruleset, mods: Mods.None, lazer: false })
          .mode
      ).toBe(3);
    }
  });

  it('provides ruleset-specific defaults while keeping all six profiles explicitly available', () => {
    for (const ruleset of [
      Ruleset.Osu,
      Ruleset.Taiko,
      Ruleset.Catch,
      Ruleset.ManiaOther,
      Ruleset.Mania4k,
      Ruleset.Mania7k,
    ]) {
      for (const mods of [0, 2, 8, 16, 64, 1024])
        expect(
          normalizeCalculationSettings({ ruleset, mods, lazer: false }).mods
        ).toBe(mods);
      const settings = getDefaultCalculationSettings(ruleset);
      expect(settings.map((entry) => entry.mods).sort((a, b) => a - b)).toEqual(
        ruleset === Ruleset.Osu
          ? [0, 2, 8, 16, 64, 1024]
          : ruleset >= Ruleset.ManiaOther
            ? [0, 64]
            : [0, 2, 16, 64]
      );
      expect(
        settings.every(
          (entry) =>
            entry.ruleset === ruleset &&
            entry.mode === Math.min(ruleset, 3) &&
            entry.lazer === false
        )
      ).toBe(true);
      expect(
        settings.find((entry) => entry.mods === Mods.DoubleTime)?.clockRate
      ).toBe(1.5);
    }
  });

  it('deduplicates NC aliases before scheduling and lookup without losing custom speed', () => {
    const requests = [
      Mods.DoubleTime,
      Mods.Nightcore,
      Mods.Nightcore | Mods.DoubleTime,
    ].map((mods) => ({ ...input, mods }));
    expect(normalizeCalculationRequests(requests)).toHaveLength(1);
    expect(
      new Set(
        requests.map((settings) =>
          createCalculationIdentity({ ...version, settings })
        )
      ).size
    ).toBe(1);
    const custom = normalizeCalculationRequests([
      ...requests,
      { ...input, mods: Mods.Nightcore, clockRate: 1.25 },
      { ...input, clockRate: 1.25 },
    ]);
    expect(custom).toHaveLength(2);
    expect(custom.map((settings) => settings.clockRate).sort()).toEqual([
      1.25, 1.5,
    ]);
  });

  it('retains every source, version, ruleset and stable/lazer identity boundary', () => {
    const identities = [
      createCalculationIdentity({ ...version, settings: input }),
      createCalculationIdentity({
        ...version,
        settings: { ...input, lazer: true },
      }),
      createCalculationIdentity({
        ...version,
        settings: { ...input, ruleset: Ruleset.Taiko },
      }),
      createCalculationIdentity({
        ...version,
        settings: { ...input, clockRate: 1.25 },
      }),
      createCalculationIdentity({
        ...version,
        settings: input,
        checksum: 'b'.repeat(64),
      }),
      createCalculationIdentity({
        ...version,
        settings: input,
        calculatorVersion: 'rosu-pp-js@4.0.2+duration@1.0.0',
      }),
      createCalculationIdentity({
        ...version,
        settings: input,
        formatVersion: 2,
      }),
    ];
    expect(new Set(identities).size).toBe(identities.length);
    const normalized = normalizeCalculationSettings(input);
    expect(
      createCalculationIdentity({ ...version, settings: normalized })
    ).toBe(identities[0]);
  });

  it('rejects empty or unbounded job batches after canonical deduplication', () => {
    expect(() => normalizeCalculationRequests([])).toThrow();
    const requests = Array.from({ length: 65 }, (_, i) => ({
      ...input,
      clockRate: 1 + i / 100,
    }));
    expect(() => normalizeCalculationRequests(requests)).toThrow();
    expect(
      normalizeCalculationRequests(Array.from({ length: 65 }, () => input))
    ).toHaveLength(1);
  });

  it('rejects invalid modes, unsupported profiles and clock values the calculator would clamp', () => {
    for (const clockRate of [0, 0.001, 101, Infinity, NaN]) {
      expect(() =>
        normalizeCalculationSettings({ ...input, clockRate })
      ).toThrow();
    }
    for (const mods of [-1, Mods.HalfTime, Mods.HardRock | Mods.Hidden, 0.5]) {
      expect(() => normalizeCalculationSettings({ ...input, mods })).toThrow();
    }
    expect(() =>
      normalizeCalculationSettings({ ...input, ruleset: 6 as Ruleset })
    ).toThrow();
    expect(
      CalculationSettingsSchema.safeParse({
        ...normalizeCalculationSettings(input),
        mode: 3,
      }).success
    ).toBe(false);
    expect(
      CalculationSettingsSchema.safeParse({
        ...normalizeCalculationSettings(input),
        mods: Mods.Nightcore,
      }).success
    ).toBe(false);
  });

  it('preserves fractional effective attributes and inapplicable nulls', () => {
    const parsed = CalculatedBeatmapAttributesSchema.parse(maniaResult);
    expect(parsed.od).toBe(11.125);
    expect(parsed.totalLength).toBe(5.75);
    expect(parsed.ar).toBeNull();
    expect(parsed.cs).toBeNull();
  });

  it('rejects nonfinite, inconsistent and unversioned calculator payloads', () => {
    for (const patch of [
      { sr: NaN },
      { bpm: Infinity },
      { ar: -Infinity },
      { drainLength: 6 },
      { sr: 4 },
    ]) {
      expect(
        CalculatedBeatmapAttributesSchema.safeParse({
          ...maniaResult,
          ...patch,
        }).success
      ).toBe(false);
    }
    for (const patch of [
      { version: 2 },
      { mode: 0 },
      { isConvert: true },
      { keyCount: null },
      { attributes: { ...maniaResult.difficulty.attributes, nHoldNotes: NaN } },
      {
        attributes: {
          ...maniaResult.difficulty.attributes,
          unknownDifficulty: 1,
        },
      },
    ]) {
      expect(
        BeatmapDifficultyPayloadSchema.safeParse({
          ...maniaResult.difficulty,
          ...patch,
        }).success
      ).toBe(false);
    }
  });

  it('requires a versioned file-backed result instead of only a mod star rating', () => {
    const columns = getTableConfig(beatmapAttributes).columns.map(
      (column) => column.name
    );
    expect(columns).toContain('file_id');
    expect(columns).toContain('calculator_version');
    expect(columns).toContain('format_version');
    expect(columns).toContain('total_length');
    expect(columns).toContain('drain_length');
  });

  it('binds result provenance to the same beatmap and checksum and deduplicates exact sources', () => {
    const results = getTableConfig(beatmapAttributes);
    const sourceFk = results.foreignKeys.find(
      (key) => key.getName() === 'beatmap_attributes_source_beatmap_checksum_fk'
    );
    expect(sourceFk?.reference().columns.map((column) => column.name)).toEqual([
      'file_id',
      'beatmap_id',
      'checksum',
    ]);
    expect(
      sourceFk?.reference().foreignColumns.map((column) => column.name)
    ).toEqual(['id', 'beatmap_id', 'checksum']);
    expect(
      results.indexes.find(
        (index) =>
          index.config.name === 'beatmap_attributes_source_identity_key'
      )?.config.unique
    ).toBe(true);
    expect(
      getTableConfig(beatmapFiles).indexes.find(
        (index) =>
          index.config.name === 'beatmap_files_beatmap_provider_checksum_key'
      )?.config.unique
    ).toBe(true);
    expect(
      getTableConfig(beatmapAttributeJobs).indexes.find(
        (index) => index.config.name === 'beatmap_attribute_jobs_beatmap_key'
      )?.config.unique
    ).toBe(true);
  });
});
