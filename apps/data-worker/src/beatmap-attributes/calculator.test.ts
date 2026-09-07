import { describe, expect, spyOn, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  Beatmap,
  BeatmapAttributes,
  Difficulty,
  DifficultyAttributes,
} from 'rosu-pp-js';
import * as calculator from './calculator';

const fixture = (id: number) =>
  readFileSync(new URL(`./calculator-fixtures/${id}.osu`, import.meta.url));
const settings = (ruleset: number, mods = 0) => ({
  ruleset,
  mods,
  lazer: false as const,
});
const profiles = [0, 16, 8, 2, 1024, 64];
const { calculateBeatmapAttributes, inspectBeatmap } = calculator;

const payloadKeys = [
  ['aim', 'speed', 'flashlight', 'nCircles', 'nSliders', 'nSpinners'],
  ['stamina', 'rhythm', 'color', 'reading'],
  ['nFruits', 'nDroplets', 'nTinyDroplets'],
  ['keyCount', 'nObjects', 'nHoldNotes'],
];

describe('released rosu calculator', () => {
  for (const [id, ruleset, mode] of [
    [2785319, 0, 0],
    [1028484, 1, 1],
    [2118524, 2, 2],
    [1638954, 4, 3],
    [763919, 5, 3],
  ] as const) {
    test(`calculates six compact profiles from native file ${id}`, () => {
      const bytes = fixture(id);
      expect(inspectBeatmap(bytes).rulesets).toEqual(
        ruleset >= 3 ? [3, ruleset] : [ruleset]
      );
      for (const mods of profiles) {
        const result = calculateBeatmapAttributes(
          bytes,
          settings(ruleset, mods)
        );
        expect(result.sr).toBeGreaterThan(0);
        expect(result.maxCombo).toBeGreaterThan(0);
        expect(result).not.toHaveProperty('totalLength');
        expect(result).not.toHaveProperty('drainLength');
        expect(result.difficulty.mode).toBe(mode);
        expect(result.difficulty.version).toBe(2);
        expect(Object.keys(result.difficulty).sort()).toEqual(
          ['version', 'mode', ...payloadKeys[mode]!].sort()
        );
      }
    });
  }

  test('batches profiles on one parsed map without leaking mod state between results', () => {
    const batchCalculate = calculator.calculateBeatmapAttributesBatch;
    expect(batchCalculate).toBeFunction();
    const bytes = fixture(2785319);
    const inputs = profiles.map((mods) => settings(0, mods));
    const expected = new Map(
      inputs.map((input) => [
        input.mods,
        calculateBeatmapAttributes(bytes, input),
      ])
    );
    const free = spyOn(Beatmap.prototype, 'free');
    const parsed = spyOn(Beatmap.prototype, 'isSuspicious');
    try {
      const batch = batchCalculate(bytes, [...inputs].reverse());
      expect(free).toHaveBeenCalledTimes(1);
      expect(parsed).toHaveBeenCalledTimes(1);
      expect(batch.sourceMode).toBe(0);
      expect(batch.keyCount).toBeNull();
      expect(batch.results).toHaveLength(6);
      for (const { settings: input, attributes } of batch.results) {
        expect(attributes).toEqual(expected.get(input.mods)!);
      }
    } finally {
      free.mockRestore();
      parsed.mockRestore();
    }
  });

  test('batch NC, DT and NC-with-DT calculate once with one standard clock rate', () => {
    const batchCalculate = calculator.calculateBeatmapAttributesBatch;
    expect(batchCalculate).toBeFunction();
    const bytes = fixture(2785319);
    const batch = batchCalculate(
      bytes,
      [64, 512, 576].map((mods) => settings(0, mods))
    );
    expect(batch.results).toHaveLength(1);
    const result = batch.results[0]!;
    expect(result.settings.mods).toBe(64);
    expect(result.settings.clockRate).toBe(1.5);
    expect(result.attributes).toEqual(
      calculateBeatmapAttributes(bytes, settings(0, 64))
    );
    const nm = calculateBeatmapAttributes(bytes, settings(0));
    expect(result.attributes.bpm).toBeCloseTo(nm.bpm! * 1.5, 10);
    expect(result.attributes.clockRate).toBe(1.5);
    expect(result.attributes.ar).toBeGreaterThan(10);
    expect(result.attributes.od).toBeGreaterThan(10);
  });

  test('rejects custom clock rates and lazer calculation requests', () => {
    const bytes = fixture(2785319);
    for (const input of [
      { ...settings(0), clockRate: 1.2 },
      { ...settings(0, 64), clockRate: 1.2 },
      { ...settings(0), lazer: true },
    ]) {
      expect(() =>
        calculateBeatmapAttributes(
          bytes,
          input as Parameters<typeof calculateBeatmapAttributes>[1]
        )
      ).toThrow();
    }
  });

  test('stable mania windows and inapplicable values remain explicit', () => {
    const taiko = calculateBeatmapAttributes(fixture(1028484), settings(1));
    expect(taiko.ar).toBeNull();
    expect(taiko.cs).toBeNull();
    expect(taiko.hitWindows.ar).toBeNull();
    const catcher = calculateBeatmapAttributes(fixture(2118524), settings(2));
    expect(catcher.od).toBeNull();
    expect(catcher.hitWindows.odGreat).toBeNull();
    const mania = calculateBeatmapAttributes(fixture(1638954), settings(4));
    expect(mania.cs).toBeNull();
    expect(mania.ar).toBeNull();
    expect(mania.difficulty).toMatchObject({ mode: 3, keyCount: 4 });
    expect(mania.hitWindows.odPerfect).toBe(16.5);
  });

  test('native mania metadata preserves its key count for generic and specific targets', () => {
    for (const [id, ruleset, keyCount] of [
      [1638954, 4, 4],
      [763919, 5, 7],
    ] as const) {
      const bytes = fixture(id);
      const generic = calculateBeatmapAttributes(bytes, settings(3));
      expect(generic).toEqual(
        calculateBeatmapAttributes(bytes, settings(ruleset))
      );
      expect(generic.difficulty).toMatchObject({ mode: 3, keyCount });
    }
    const other = new TextEncoder().encode(
      fixture(1638954).toString().replace('CircleSize:4', 'CircleSize:6')
    );
    expect(inspectBeatmap(other)).toEqual({
      mode: 3,
      keyCount: 6,
      rulesets: [3],
    });
    expect(
      calculateBeatmapAttributes(other, settings(3)).difficulty
    ).toMatchObject({ keyCount: 6 });
  });

  test('frees the parsed map when the native target is incompatible', () => {
    const batchCalculate = calculator.calculateBeatmapAttributesBatch;
    expect(batchCalculate).toBeFunction();
    const free = spyOn(Beatmap.prototype, 'free');
    try {
      expect(() => batchCalculate(fixture(2785319), [settings(1)])).toThrow(
        'native beatmap'
      );
      expect(free).toHaveBeenCalledTimes(1);
    } finally {
      free.mockRestore();
    }
  });

  test('rejects nonfinite results and releases every allocated WASM resource', () => {
    const stars = Object.getOwnPropertyDescriptor(
      DifficultyAttributes.prototype,
      'stars'
    )!;
    Object.defineProperty(DifficultyAttributes.prototype, 'stars', {
      ...stars,
      get: () => Infinity,
    });
    const frees = [
      Beatmap,
      Difficulty,
      DifficultyAttributes,
      BeatmapAttributes,
    ].map((resource) => spyOn(resource.prototype, 'free'));
    try {
      expect(() =>
        calculateBeatmapAttributes(fixture(2785319), settings(0))
      ).toThrow();
      for (const free of frees) expect(free).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(DifficultyAttributes.prototype, 'stars', stars);
      for (const free of frees) free.mockRestore();
    }
  });

  test('rejects suspicious density and excessive object counts before difficulty work', () => {
    const source = fixture(2785319).toString().split('[HitObjects]')[0]!;
    for (const [count, error] of [
      [1000, 'suspicious'],
      [100001, 'too many'],
    ] as const) {
      const bytes = new TextEncoder().encode(
        source + '[HitObjects]\n' + '64,64,1000,1,0,0:0:0:0:\n'.repeat(count)
      );
      expect(() => inspectBeatmap(bytes)).toThrow(error);
    }
  });

  test('rejects invalid and nonfinite source fields instead of parser defaults', () => {
    const source = fixture(2785319).toString();
    for (const variant of [
      source.replace('Mode: 0', 'Mode: 9'),
      source.replace('OverallDifficulty:8.8', 'OverallDifficulty:NaN'),
      source.replace('[TimingPoints]', '[TimingPoints]\n0,0,4,1,0,100,1,0'),
      source + '\n64,64,NaN,1,0,0:0:0:0:\n',
    ]) {
      expect(variant).not.toBe(source);
      expect(() => inspectBeatmap(new TextEncoder().encode(variant))).toThrow();
    }
  });

  test('rejects incompatible targets, malformed, empty and oversized files', () => {
    expect(() =>
      calculateBeatmapAttributes(fixture(1638954), settings(5))
    ).toThrow();
    expect(() =>
      calculateBeatmapAttributes(fixture(1028484), settings(0))
    ).toThrow();
    for (const content of [
      '<html>no map</html>',
      'osu file format v14\n[HitObjects]\n',
      'osu file format v14\n[General]\nMode:0\n[HitObjects]\nmalformed',
    ])
      expect(() => inspectBeatmap(new TextEncoder().encode(content))).toThrow();
    expect(() => inspectBeatmap(new Uint8Array(8 * 1024 * 1024 + 1))).toThrow();
  });
});
