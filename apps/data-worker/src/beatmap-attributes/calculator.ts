import {
  Beatmap,
  BeatmapAttributesBuilder,
  Difficulty,
  GameMode,
  type BeatmapAttributes,
  type DifficultyAttributes,
} from 'rosu-pp-js';

import {
  CALCULATION_FORMAT_VERSION,
  CalculatedBeatmapAttributesSchema,
  normalizeCalculationRequests,
  type CalculationSettings,
  type CalculatedBeatmapAttributes,
  type CalculationSettingsInput,
} from '@otr/core/osu/beatmap-attributes';
import { Ruleset } from '@otr/core/osu';

import {
  MAX_BEATMAP_FILE_BYTES,
  MAX_BEATMAP_OBJECTS,
} from './calculator-version';

export { CALCULATOR_VERSION } from './calculator-version';

export interface BeatmapInspection {
  mode: GameMode;
  keyCount: number | null;
  rulesets: Ruleset[];
}

// rosu tolerates malformed entries; reject fields that could silently use parser defaults.
function validateSource(bytes: Uint8Array): number {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BEATMAP_FILE_BYTES) {
    throw new Error('Beatmap file size is outside the supported range');
  }
  const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (!/^osu file format v\d+\s*$/.test(lines[0] ?? '')) {
    throw new Error('Invalid osu file header');
  }
  let section = '';
  let objectCount = 0;
  let timingCount = 0;
  for (const rawLine of lines.slice(1)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('//')) continue;
    if (line.startsWith('[') && line.endsWith(']')) {
      section = line;
      continue;
    }
    if (section === '[General]' && line.startsWith('Mode:')) {
      const mode = Number(line.slice('Mode:'.length).trim());
      if (!Number.isInteger(mode) || mode < 0 || mode > 3) {
        throw new Error('Invalid source ruleset');
      }
    }
    if (section === '[Difficulty]') {
      const [name, rawValue] = line.split(':');
      if (
        name &&
        [
          'HPDrainRate',
          'CircleSize',
          'OverallDifficulty',
          'ApproachRate',
          'SliderMultiplier',
          'SliderTickRate',
        ].includes(name)
      ) {
        const value = Number(rawValue);
        if (
          !rawValue?.trim() ||
          !Number.isFinite(value) ||
          ((name === 'SliderMultiplier' || name === 'SliderTickRate') &&
            value <= 0)
        ) {
          throw new Error('Invalid source difficulty');
        }
      }
    }
    if (section === '[TimingPoints]') {
      const fields = line.split(',');
      if (
        !fields[0]?.trim() ||
        !fields[1]?.trim() ||
        !Number.isFinite(Number(fields[0])) ||
        !Number.isFinite(Number(fields[1])) ||
        Number(fields[1]) === 0
      ) {
        throw new Error('Invalid timing point');
      }
      timingCount++;
    }
    if (section !== '[HitObjects]') continue;
    const fields = line.split(',');
    if (
      fields.length < 5 ||
      fields
        .slice(0, 5)
        .some((field) => field.trim() === '' || !Number.isFinite(Number(field)))
    ) {
      throw new Error('Invalid hit object');
    }
    const type = Number(fields[3]);
    const kind = type & (1 | 2 | 8 | 128);
    if (!Number.isInteger(type) || ![1, 2, 8, 128].includes(kind)) {
      throw new Error('Invalid hit object type');
    }
    if (kind === 8 || kind === 128) {
      const end = kind === 128 ? fields[5]?.split(':')[0] : fields[5];
      if (
        !end?.trim() ||
        !Number.isFinite(Number(end)) ||
        Number(end) < Number(fields[2])
      ) {
        throw new Error('Invalid object end');
      }
    }
    if (
      kind === 2 &&
      (!Number.isInteger(Number(fields[6])) ||
        Number(fields[6]) < 1 ||
        (fields[7] !== undefined &&
          (!Number.isFinite(Number(fields[7])) || Number(fields[7]) < 0)))
    ) {
      throw new Error('Invalid slider');
    }
    objectCount++;
    if (objectCount > MAX_BEATMAP_OBJECTS) {
      throw new Error('Beatmap has too many hit objects');
    }
  }
  if (objectCount === 0 || timingCount === 0) {
    throw new Error('Beatmap requires hit objects and timing points');
  }
  return objectCount;
}

function parseBeatmap(bytes: Uint8Array): Beatmap {
  const objectCount = validateSource(bytes);
  const map = new Beatmap(bytes);
  try {
    if (map.nObjects !== objectCount || map.isSuspicious()) {
      throw new Error('Beatmap is invalid or suspicious');
    }
    if (![map.ar, map.od, map.cs, map.hp, map.bpm].every(Number.isFinite)) {
      throw new Error('Beatmap contains nonfinite attributes');
    }
    return map;
  } catch (error) {
    map.free();
    throw error;
  }
}

function inspectParsedBeatmap(map: Beatmap): BeatmapInspection {
  switch (map.mode) {
    case GameMode.Osu:
      return { mode: GameMode.Osu, keyCount: null, rulesets: [Ruleset.Osu] };
    case GameMode.Taiko:
      return {
        mode: GameMode.Taiko,
        keyCount: null,
        rulesets: [Ruleset.Taiko],
      };
    case GameMode.Catch:
      return {
        mode: GameMode.Catch,
        keyCount: null,
        rulesets: [Ruleset.Catch],
      };
    case GameMode.Mania: {
      const keyCount = map.cs;
      if (!Number.isInteger(keyCount) || keyCount < 1 || keyCount > 18) {
        throw new Error('Unsupported mania key count');
      }
      const ruleset =
        keyCount === 4
          ? Ruleset.Mania4k
          : keyCount === 7
            ? Ruleset.Mania7k
            : Ruleset.ManiaOther;
      return {
        mode: GameMode.Mania,
        keyCount,
        rulesets:
          ruleset === Ruleset.ManiaOther
            ? [Ruleset.ManiaOther]
            : [Ruleset.ManiaOther, ruleset],
      };
    }
    default:
      throw new Error('Unsupported beatmap mode');
  }
}

export function inspectBeatmap(bytes: Uint8Array): BeatmapInspection {
  const map = parseBeatmap(bytes);
  try {
    return inspectParsedBeatmap(map);
  } finally {
    map.free();
  }
}

export interface CalculationBatch {
  sourceMode: GameMode;
  keyCount: number | null;
  results: Array<{
    settings: CalculationSettings;
    attributes: CalculatedBeatmapAttributes;
  }>;
}

function difficultyPayload(
  mode: GameMode,
  keyCount: number | null,
  attributes: DifficultyAttributes
) {
  const version = CALCULATION_FORMAT_VERSION;
  switch (mode) {
    case GameMode.Osu:
      return {
        version,
        mode,
        aim: attributes.aim,
        speed: attributes.speed,
        flashlight: attributes.flashlight,
        nCircles: attributes.nCircles,
        nSliders: attributes.nSliders,
        nSpinners: attributes.nSpinners,
      };
    case GameMode.Taiko:
      return {
        version,
        mode,
        stamina: attributes.stamina,
        rhythm: attributes.rhythm,
        color: attributes.color,
        reading: attributes.reading,
      };
    case GameMode.Catch:
      return {
        version,
        mode,
        nFruits: attributes.nFruits,
        nDroplets: attributes.nDroplets,
        nTinyDroplets: attributes.nTinyDroplets,
      };
    case GameMode.Mania:
      return {
        version,
        mode,
        keyCount,
        nObjects: attributes.nObjects,
        nHoldNotes: attributes.nHoldNotes,
      };
  }
}

function calculateProfile(
  map: Beatmap,
  inspection: BeatmapInspection,
  settings: CalculationSettings
): CalculatedBeatmapAttributes {
  if (
    !inspection.rulesets.includes(settings.ruleset) ||
    inspection.mode !== settings.mode
  ) {
    throw new Error('Target ruleset does not match the native beatmap');
  }
  let difficulty: Difficulty | undefined;
  let difficultyAttributes: DifficultyAttributes | undefined;
  let attributes: BeatmapAttributes | undefined;
  try {
    const mods = [
      ...(settings.mods & 2 ? ['EZ'] : []),
      ...(settings.mods & 8 ? ['HD'] : []),
      ...(settings.mods & 16 ? ['HR'] : []),
      ...(settings.mods & 64 ? ['DT'] : []),
      ...(settings.mods & 1024 ? ['FL'] : []),
      // BeatmapAttributesBuilder has no lazer argument; CL selects stable mania windows.
      'CL',
    ];
    const commonSettings = { mods, clockRate: settings.clockRate };
    difficulty = new Difficulty({ ...commonSettings, lazer: false });
    difficultyAttributes = difficulty.calculate(map);
    // build() consumes the WASM builder, including when the call throws.
    attributes = new BeatmapAttributesBuilder({
      ...commonSettings,
      map,
      mode: settings.mode,
      isConvert: false,
    }).build();
    const hasApproachRate =
      settings.mode === GameMode.Osu || settings.mode === GameMode.Catch;
    return CalculatedBeatmapAttributesSchema.parse({
      ar: hasApproachRate ? attributes.ar : null,
      od: settings.mode === GameMode.Catch ? null : attributes.od,
      cs: hasApproachRate ? attributes.cs : null,
      hpDrain: attributes.hp,
      sr: difficultyAttributes.stars,
      bpm: map.bpm * settings.clockRate,
      maxCombo: difficultyAttributes.maxCombo,
      clockRate: attributes.clockRate,
      hitWindows: {
        ar: attributes.arHitWindow ?? null,
        odPerfect: attributes.odPerfectHitWindow ?? null,
        odGreat: attributes.odGreatHitWindow ?? null,
        odGood: attributes.odGoodHitWindow ?? null,
        odOk: attributes.odOkHitWindow ?? null,
        odMeh: attributes.odMehHitWindow ?? null,
      },
      difficulty: difficultyPayload(
        settings.mode,
        inspection.keyCount,
        difficultyAttributes
      ),
    });
  } finally {
    attributes?.free();
    difficultyAttributes?.free();
    difficulty?.free();
  }
}

export function calculateBeatmapAttributesBatch(
  bytes: Uint8Array,
  inputs: readonly CalculationSettingsInput[]
): CalculationBatch {
  const settings = normalizeCalculationRequests(inputs);
  const map = parseBeatmap(bytes);
  try {
    const inspection = inspectParsedBeatmap(map);
    return {
      sourceMode: inspection.mode,
      keyCount: inspection.keyCount,
      results: settings.map((setting) => ({
        settings: setting,
        attributes: calculateProfile(map, inspection, setting),
      })),
    };
  } finally {
    map.free();
  }
}

export function calculateBeatmapAttributes(
  bytes: Uint8Array,
  input: CalculationSettingsInput
): CalculatedBeatmapAttributes {
  return calculateBeatmapAttributesBatch(bytes, [input]).results[0]!.attributes;
}
