import { describe, expect, it } from 'bun:test';
import { getTableConfig } from 'drizzle-orm/pg-core';

import * as contracts from '../beatmap-attributes';
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

const input = {
  ruleset: Ruleset.Osu,
  mods: Mods.DoubleTime,
  lazer: false as const,
};
const version = {
  checksum: 'a'.repeat(64),
  calculatorVersion: 'rosu-pp-js@4.0.1',
  formatVersion: 2,
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
  hitWindows: {
    ar: null,
    odPerfect: 16,
    odGreat: 31.5,
    odGood: 64,
    odOk: 97,
    odMeh: 121,
  },
  difficulty: { version: 2, mode: 3, keyCount: 4, nObjects: 4, nHoldNotes: 1 },
} as const;

describe('beatmap calculation contracts', () => {
  it('canonicalizes DT, NC and NC with DT before deduplication and identity', () => {
    const inputs = [
      Mods.DoubleTime,
      Mods.Nightcore,
      Mods.Nightcore | Mods.DoubleTime,
    ].map((mods) => ({ ...input, mods }));
    expect(inputs.map(normalizeCalculationSettings)).toEqual(
      Array.from({ length: 3 }, () => ({
        ruleset: Ruleset.Osu,
        mode: 0,
        mods: Mods.DoubleTime,
        clockRate: 1.5,
        lazer: false,
      }))
    );
    expect(normalizeCalculationRequests(inputs)).toHaveLength(1);
    expect(
      new Set(
        inputs.map((settings) =>
          createCalculationIdentity({ ...version, settings })
        )
      ).size
    ).toBe(1);
  });

  it('keeps all native ruleset mappings and individual profiles with reduced defaults', () => {
    for (const ruleset of [
      Ruleset.Osu,
      Ruleset.Taiko,
      Ruleset.Catch,
      Ruleset.ManiaOther,
      Ruleset.Mania4k,
      Ruleset.Mania7k,
    ]) {
      for (const mods of [0, 2, 8, 16, 64, 1024]) {
        const setting = normalizeCalculationSettings({
          ruleset,
          mods,
          lazer: false,
        });
        expect(setting).toEqual({
          ruleset,
          mode:
            ruleset === Ruleset.Osu
              ? 0
              : ruleset === Ruleset.Taiko
                ? 1
                : ruleset === Ruleset.Catch
                  ? 2
                  : 3,
          mods,
          lazer: false,
          clockRate: mods === 64 ? 1.5 : 1,
        });
      }
      expect(
        getDefaultCalculationSettings(ruleset)
          .map((s) => s.mods)
          .sort((a, b) => a - b)
      ).toEqual(
        ruleset === Ruleset.Osu
          ? [0, 2, 8, 16, 64, 1024]
          : ruleset >= Ruleset.ManiaOther
            ? [0, 64]
            : [0, 2, 16, 64]
      );
    }
  });

  it('rejects custom rates and lazer while accepting explicitly supplied standard rates', () => {
    for (const clockRate of [0, 0.001, 1, 1.25, 100, 101, Infinity, NaN])
      expect(() =>
        normalizeCalculationSettings({
          ...input,
          clockRate,
        } as unknown as contracts.CalculationSettingsInput)
      ).toThrow();
    expect(
      normalizeCalculationSettings({ ...input, clockRate: 1.5 }).clockRate
    ).toBe(1.5);
    expect(
      normalizeCalculationSettings({ ...input, mods: Mods.None, clockRate: 1 })
        .clockRate
    ).toBe(1);
    for (const patch of [
      { lazer: true },
      { clockRate: 1.25 },
      { clockRate: 1 },
    ])
      expect(
        CalculationSettingsSchema.safeParse({
          ...normalizeCalculationSettings(input),
          ...patch,
        }).success
      ).toBe(false);
    expect(() =>
      normalizeCalculationSettings({
        ...input,
        lazer: true,
      } as unknown as typeof input)
    ).toThrow();
  });

  it('rejects invalid modes, unsupported profiles and mixed target rulesets', () => {
    for (const mods of [-1, Mods.HalfTime, Mods.HardRock | Mods.Hidden, 0.5])
      expect(() => normalizeCalculationSettings({ ...input, mods })).toThrow();
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
    expect(() =>
      normalizeCalculationRequests([
        input,
        { ...input, ruleset: Ruleset.Mania4k },
      ])
    ).toThrow();
    expect(() => normalizeCalculationRequests([])).toThrow();
    expect(
      normalizeCalculationRequests(Array.from({ length: 65 }, () => input))
    ).toHaveLength(1);
  });

  it('separates native targets, source and calculator/format versions in stable identity', () => {
    const identities = [
      createCalculationIdentity({ ...version, settings: input }),
      createCalculationIdentity({
        ...version,
        settings: { ...input, mods: Mods.None },
      }),
      createCalculationIdentity({
        ...version,
        settings: { ...input, ruleset: Ruleset.ManiaOther },
      }),
      createCalculationIdentity({
        ...version,
        settings: { ...input, ruleset: Ruleset.Mania4k },
      }),
      createCalculationIdentity({
        ...version,
        settings: input,
        checksum: 'b'.repeat(64),
      }),
      createCalculationIdentity({
        ...version,
        settings: input,
        calculatorVersion: 'rosu-pp-js@4.0.2',
      }),
      createCalculationIdentity({
        ...version,
        settings: input,
        formatVersion: 3,
      }),
    ];
    expect(new Set(identities).size).toBe(identities.length);
    expect(
      createCalculationIdentity({
        ...version,
        settings: normalizeCalculationSettings(input),
      })
    ).toBe(identities[0]);
    expect(JSON.parse(identities[0]).settings).toMatchObject({
      lazer: false,
      clockRate: 1.5,
      mode: 0,
    });
  });

  it('accepts compact version 2 difficulty components for all library modes', () => {
    const payloads = [
      {
        version: 2,
        mode: 0,
        aim: 1.2,
        speed: 0.8,
        flashlight: 0,
        nCircles: 4,
        nSliders: 2,
        nSpinners: 1,
      },
      {
        version: 2,
        mode: 1,
        stamina: 1.2,
        rhythm: 0.8,
        color: 0.2,
        reading: 0,
      },
      { version: 2, mode: 2, nFruits: 4, nDroplets: 3, nTinyDroplets: 2 },
      maniaResult.difficulty,
    ] as const;
    for (const payload of payloads)
      expect(BeatmapDifficultyPayloadSchema.parse(payload)).toEqual(payload);
  });

  it('preserves fractional effective attributes and inapplicable nulls without result durations', () => {
    const parsed = CalculatedBeatmapAttributesSchema.parse(maniaResult);
    expect(parsed.od).toBe(11.125);
    expect(parsed.bpm).toBe(180.25);
    expect(parsed.ar).toBeNull();
    expect(parsed.cs).toBeNull();
    expect(
      CalculatedBeatmapAttributesSchema.safeParse({
        ...maniaResult,
        totalLength: 5.75,
        drainLength: 4.25,
      }).success
    ).toBe(false);
    const columns = getTableConfig(beatmapAttributes).columns.map(
      (column) => column.name
    );
    expect(columns).not.toContain('total_length');
    expect(columns).not.toContain('drain_length');
  });

  it('rejects nonfinite values, legacy wrappers and duplicated difficulty fields', () => {
    for (const patch of [
      { sr: NaN },
      { bpm: Infinity },
      { ar: -Infinity },
      { clockRate: 1.25 },
    ])
      expect(
        CalculatedBeatmapAttributesSchema.safeParse({
          ...maniaResult,
          ...patch,
        }).success
      ).toBe(false);
    for (const patch of [
      { version: 1 },
      { mode: 0 },
      { keyCount: null },
      { nHoldNotes: NaN },
      { nObjects: 0.5 },
      { attributes: { mode: 3 } },
      { stars: 3.125 },
      { maxCombo: 4 },
      { isConvert: false },
    ])
      expect(
        BeatmapDifficultyPayloadSchema.safeParse({
          ...maniaResult.difficulty,
          ...patch,
        }).success
      ).toBe(false);
  });

  it('binds each result and both pending/completed file pointers to their beatmap', () => {
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
    const jobs = getTableConfig(beatmapAttributeJobs);
    expect(
      jobs.foreignKeys.some(
        (key) =>
          key
            .reference()
            .columns.map((c) => c.name)
            .join(',') === 'acquired_file_id,beatmap_id'
      )
    ).toBe(true);
    expect(
      jobs.foreignKeys.some(
        (key) =>
          key
            .reference()
            .columns.map((c) => c.name)
            .join(',') === 'source_file_id,beatmap_id'
      )
    ).toBe(true);
    expect(jobs.columns.map((c) => c.name)).not.toContain(
      'source_metadata_updated_at'
    );
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
  });
});

describe('metadata lengths at standard mod speed', () => {
  it('scales metadata lengths once for DT and both NC masks', () => {
    expect(typeof contracts.getBeatmapMetadataLengths).toBe('function');
    const metadata = { totalLength: 121.5, drainLength: 90.75 };
    for (const mods of [0, 2, 8, 16, 1024])
      expect(contracts.getBeatmapMetadataLengths(metadata, mods)).toEqual(
        metadata
      );
    for (const mods of [64, 512, 576])
      expect(contracts.getBeatmapMetadataLengths(metadata, mods)).toEqual({
        totalLength: 81,
        drainLength: 60.5,
      });
    expect(metadata).toEqual({ totalLength: 121.5, drainLength: 90.75 });
  });

  it('preserves missing lengths and rejects unsupported mods or invalid metadata', () => {
    expect(typeof contracts.getBeatmapMetadataLengths).toBe('function');
    expect(
      contracts.getBeatmapMetadataLengths(
        { totalLength: null, drainLength: null },
        512
      )
    ).toEqual({ totalLength: null, drainLength: null });
    expect(
      contracts.getBeatmapMetadataLengths(
        { totalLength: 0, drainLength: null },
        64
      )
    ).toEqual({ totalLength: 0, drainLength: null });
    for (const totalLength of [-1, NaN, Infinity])
      expect(() =>
        contracts.getBeatmapMetadataLengths(
          { totalLength, drainLength: null },
          0
        )
      ).toThrow();
    expect(() =>
      contracts.getBeatmapMetadataLengths(
        { totalLength: 10, drainLength: 5 },
        Mods.HalfTime
      )
    ).toThrow();
  });
});
