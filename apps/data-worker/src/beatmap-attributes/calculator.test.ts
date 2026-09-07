import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { calculateBeatmapAttributes, inspectBeatmap } from './calculator';

const fixture = (id: number) =>
  readFileSync(new URL(`./calculator-fixtures/${id}.osu`, import.meta.url));
const settings = (ruleset: number, mods = 0, clockRate = 1, lazer = false) => ({
  ruleset,
  mode: ruleset > 3 ? 3 : ruleset,
  mods,
  clockRate,
  lazer,
});

describe('real rosu calculator', () => {
  for (const [id, ruleset, mode] of [
    [2785319, 0, 0],
    [1028484, 1, 1],
    [2118524, 2, 2],
    [1638954, 4, 3],
    [763919, 5, 3],
  ] as const) {
    test(`identifies native file ${id} and calculates all six profiles`, () => {
      const bytes = fixture(id!);
      expect(inspectBeatmap(bytes).rulesets).toEqual(
        ruleset >= 3 ? [3, ruleset] : [ruleset]
      );
      for (const mods of [0, 16, 8, 2, 1024, 64]) {
        const result = calculateBeatmapAttributes(
          bytes,
          settings(ruleset!, mods, mods === 64 ? 1.5 : 1)
        );
        expect(result.sr).toBeGreaterThan(0);
        expect(result.totalLength).toBeGreaterThan(0);
        expect(result.drainLength).toBeLessThanOrEqual(result.totalLength!);
        expect(result.difficulty.mode).toBe(mode);
      }
    });
  }
  test('HD and FL duplicate the entire non-osu result, while mania HR/EZ retain distinct effective attributes', () => {
    for (const [id, ruleset] of [
      [1028484, 1],
      [2118524, 2],
      [1638954, 3],
      [1638954, 4],
      [763919, 5],
    ] as const) {
      for (const lazer of [false, true]) {
        const bytes = fixture(id);
        const nm = calculateBeatmapAttributes(
          bytes,
          settings(ruleset, 0, 1, lazer)
        );
        for (const mods of [8, 1024])
          expect(
            calculateBeatmapAttributes(bytes, settings(ruleset, mods, 1, lazer))
          ).toEqual(nm);
        if (ruleset >= 3)
          for (const mods of [16, 2]) {
            const result = calculateBeatmapAttributes(
              bytes,
              settings(ruleset, mods, 1, lazer)
            );
            expect(result.sr).toBe(nm.sr);
            expect(result.od).not.toBe(nm.od);
            expect(result.hpDrain).not.toBe(nm.hpDrain);
          }
      }
    }
  });
  test('NC, DT and NC-with-DT produce one clock rate and identical output', () => {
    const bytes = fixture(2785319);
    const dt = calculateBeatmapAttributes(bytes, settings(0, 64, 1.5));
    for (const mods of [512, 576]) {
      expect(calculateBeatmapAttributes(bytes, settings(0, mods, 1.5))).toEqual(
        dt
      );
    }
    const nm = calculateBeatmapAttributes(bytes, settings(0));
    expect(dt.totalLength).toBeCloseTo(nm.totalLength! / 1.5, 10);
    expect(dt.clockRate).toBe(1.5);
    expect(dt.ar).toBeGreaterThan(10);
    expect(dt.od).toBeGreaterThan(10);
  });
  test('different effective custom speeds remain different', () => {
    const bytes = fixture(2785319);
    const slow = calculateBeatmapAttributes(bytes, settings(0, 512, 1.1));
    const fast = calculateBeatmapAttributes(bytes, settings(0, 64, 1.2));
    expect(slow.clockRate).toBe(1.1);
    expect(fast.clockRate).toBe(1.2);
    expect(slow.sr).not.toBe(fast.sr);
  });
  test('a final native taiko drum roll includes its encoded duration for NM and DT', () => {
    const content =
      fixture(1028484)
        .toString()
        .replace(
          /\[TimingPoints\][\s\S]*?\[HitObjects\]/,
          '[TimingPoints]\n0,500,4,1,0,100,1,0\n\n[HitObjects]'
        ) + '\n256,192,90000,2,0,L|256:192,1,280\n';
    const bytes = new TextEncoder().encode(content);
    const nm = calculateBeatmapAttributes(bytes, settings(1));
    const dt = calculateBeatmapAttributes(bytes, settings(1, 64, 1.5));
    expect(nm.totalLength).toBeCloseTo(90.31, 12);
    expect(nm.drainLength).toBeCloseTo(90.31, 12);
    expect(dt.totalLength).toBeCloseTo(90.31 / 1.5, 12);
    expect(dt.drainLength).toBeCloseTo(90.31 / 1.5, 12);
  });
  test('inapplicable attributes and windows are null', () => {
    const taiko = calculateBeatmapAttributes(fixture(1028484), settings(1));
    expect(taiko.ar).toBeNull();
    expect(taiko.cs).toBeNull();
    expect(taiko.hitWindows.ar).toBeNull();
    const catcher = calculateBeatmapAttributes(fixture(2118524), settings(2));
    expect(catcher.od).toBeNull();
    expect(catcher.hitWindows.odGreat).toBeNull();
    const mania = calculateBeatmapAttributes(fixture(1638954), settings(4, 2));
    expect(mania.cs).toBeNull();
    expect(mania.ar).toBeNull();
    expect(mania.difficulty.keyCount).toBe(4);
    expect(mania.hitWindows.odPerfect).toBeGreaterThan(0);
  });
  test('explicit stable and lazer mania use distinct library windows', () => {
    const bytes = new TextEncoder().encode(
      fixture(1638954)
        .toString()
        .replace('OverallDifficulty:8', 'OverallDifficulty:5')
    );
    const stable = calculateBeatmapAttributes(bytes, settings(4, 0, 1, false));
    const lazer = calculateBeatmapAttributes(bytes, settings(4, 0, 1, true));
    expect(stable.hitWindows.odPerfect).toBe(16.5);
    expect(lazer.hitWindows.odPerfect).not.toBe(stable.hitWindows.odPerfect);
  });
  test('native mania other preserves uncommon key counts for all profiles', () => {
    const bytes = new TextEncoder().encode(
      fixture(1638954).toString().replace('CircleSize:4', 'CircleSize:6')
    );
    expect(inspectBeatmap(bytes)).toEqual({
      mode: 3,
      keyCount: 6,
      rulesets: [3],
    });
    for (const mods of [0, 16, 8, 2, 1024, 64]) {
      const result = calculateBeatmapAttributes(
        bytes,
        settings(3, mods, mods === 64 ? 1.5 : 1)
      );
      expect(result.difficulty.keyCount).toBe(6);
      expect(result.sr).toBeGreaterThan(0);
    }
  });
  test('native 4K and 7K accept generic mania metadata without changing key count', () => {
    for (const [id, ruleset, keyCount] of [
      [1638954, 4, 4],
      [763919, 5, 7],
    ] as const) {
      const bytes = fixture(id);
      const generic = calculateBeatmapAttributes(bytes, settings(3));
      const specific = calculateBeatmapAttributes(bytes, settings(ruleset));
      expect(generic).toEqual(specific);
      expect(generic.difficulty.keyCount).toBe(keyCount);
    }
  });
  test('rejects malformed source fields instead of silently calculating parser defaults', () => {
    const source = fixture(2785319).toString();
    const variants = [
      source.replace('Mode: 0', 'Mode: 9'),
      source.replace('OverallDifficulty:8.8', 'OverallDifficulty:NaN'),
      source.replace('[Events]', '[Events]\n2,3000,NaN'),
      source.replace('[TimingPoints]', '[TimingPoints]\n0,0,4,1,0,100,1,0'),
    ];
    for (const variant of variants) {
      expect(variant).not.toBe(source);
      expect(() => inspectBeatmap(new TextEncoder().encode(variant))).toThrow();
    }
  });
  test('rejects incompatible target, malformed, empty, oversized and suspicious files', () => {
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
    ]) {
      expect(() => inspectBeatmap(new TextEncoder().encode(content))).toThrow();
    }
    expect(() => inspectBeatmap(new Uint8Array(8 * 1024 * 1024 + 1))).toThrow();
  });
});
