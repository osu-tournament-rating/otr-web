import { z } from 'zod';

import { Mods, Ruleset } from './enums';

export const CALCULATION_FORMAT_VERSION = 1;
export const MAX_CALCULATION_REQUESTS = 64;
export const BEATMAP_ATTRIBUTE_PROFILES = [
  Mods.None,
  Mods.HardRock,
  Mods.Hidden,
  Mods.Easy,
  Mods.Flashlight,
  Mods.DoubleTime,
] as const;

const defaultProfiles: Record<Ruleset, readonly number[]> = {
  [Ruleset.Osu]: BEATMAP_ATTRIBUTE_PROFILES,
  [Ruleset.Taiko]: [Mods.None, Mods.HardRock, Mods.Easy, Mods.DoubleTime],
  [Ruleset.Catch]: [Mods.None, Mods.HardRock, Mods.Easy, Mods.DoubleTime],
  // HR/EZ still change effective OD/HP; keep them available for explicit requests.
  [Ruleset.ManiaOther]: [Mods.None, Mods.DoubleTime],
  [Ruleset.Mania4k]: [Mods.None, Mods.DoubleTime],
  [Ruleset.Mania7k]: [Mods.None, Mods.DoubleTime],
};

const finite = z.number().finite();
const nonnegative = finite.nonnegative();
const count = nonnegative.int();
const nullableFinite = finite.nullable();
const modeSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);
const rulesetSchema = z.enum(Ruleset);
export const BeatmapChecksumSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const BeatmapStorageProviderSchema = z.enum(['local', 'gcp']);
export const BeatmapAttributeJobStatusSchema = z.enum([
  'pending',
  'processing',
  'complete',
  'failed',
]);

const libraryModes: Record<Ruleset, 0 | 1 | 2 | 3> = {
  [Ruleset.Osu]: 0,
  [Ruleset.Taiko]: 1,
  [Ruleset.Catch]: 2,
  [Ruleset.ManiaOther]: 3,
  [Ruleset.Mania4k]: 3,
  [Ruleset.Mania7k]: 3,
};

export const CalculationSettingsInputSchema = z
  .object({
    ruleset: rulesetSchema,
    mods: count.max(2_147_483_647),
    // rosu clamps outside this range; reject instead of aliasing distinct requests.
    clockRate: finite.min(0.01).max(100).optional(),
    lazer: z.boolean(),
  })
  .strict();

export const CalculationSettingsSchema = CalculationSettingsInputSchema.extend({
  mode: modeSchema,
  clockRate: finite.min(0.01).max(100),
}).superRefine((settings, ctx) => {
  if (libraryModes[settings.ruleset] !== settings.mode) {
    ctx.addIssue({
      code: 'custom',
      message: 'Library mode does not match target ruleset',
      path: ['mode'],
    });
  }
  if (
    !(BEATMAP_ATTRIBUTE_PROFILES as readonly number[]).includes(settings.mods)
  ) {
    ctx.addIssue({
      code: 'custom',
      message: 'Expected one canonical MVP mod profile',
      path: ['mods'],
    });
  }
});

export type CalculationSettingsInput = z.infer<
  typeof CalculationSettingsInputSchema
>;
export type CalculationSettings = z.infer<typeof CalculationSettingsSchema>;
export type BeatmapStorageProvider = z.infer<
  typeof BeatmapStorageProviderSchema
>;
export type BeatmapAttributeJobStatus = z.infer<
  typeof BeatmapAttributeJobStatusSchema
>;
export const RequestedCalculationSettingsSchema = z
  .array(CalculationSettingsSchema)
  .min(1)
  .max(MAX_CALCULATION_REQUESTS);

export function normalizeCalculationSettings(
  input: CalculationSettingsInput
): CalculationSettings {
  // Read known fields so already-normalized settings can use the same boundary.
  const parsed = CalculationSettingsInputSchema.parse({
    ruleset: input.ruleset,
    mods: input.mods,
    clockRate: input.clockRate,
    lazer: input.lazer,
  });
  const mods =
    (parsed.mods & Mods.Nightcore) !== 0
      ? (parsed.mods & ~Mods.Nightcore) | Mods.DoubleTime
      : parsed.mods;
  return CalculationSettingsSchema.parse({
    ruleset: parsed.ruleset,
    mode: libraryModes[parsed.ruleset],
    mods,
    clockRate: parsed.clockRate ?? ((mods & Mods.DoubleTime) !== 0 ? 1.5 : 1),
    lazer: parsed.lazer,
  });
}

export function normalizeCalculationRequests(
  inputs: readonly CalculationSettingsInput[]
): CalculationSettings[] {
  const settings = new Map<string, CalculationSettings>();
  for (const input of inputs) {
    const normalized = normalizeCalculationSettings(input);
    settings.set(JSON.stringify(normalized), normalized);
  }
  return RequestedCalculationSettingsSchema.parse(
    [...settings.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value)
  );
}

export function getDefaultCalculationSettings(
  ruleset: Ruleset,
  lazer = false
): CalculationSettings[] {
  return normalizeCalculationRequests(
    defaultProfiles[rulesetSchema.parse(ruleset)].map((mods) => ({
      ruleset,
      mods,
      lazer,
    }))
  );
}

export function createCalculationIdentity(input: {
  settings: CalculationSettingsInput;
  checksum: string;
  calculatorVersion: string;
  formatVersion: number;
}): string {
  const checksum = BeatmapChecksumSchema.parse(input.checksum);
  const calculatorVersion = z
    .string()
    .trim()
    .min(1)
    .max(128)
    .parse(input.calculatorVersion);
  const formatVersion = z.number().int().positive().parse(input.formatVersion);
  return JSON.stringify({
    checksum,
    calculatorVersion,
    formatVersion,
    settings: normalizeCalculationSettings(input.settings),
  });
}

export const BeatmapHitWindowsSchema = z
  .object({
    ar: nonnegative.nullable(),
    odPerfect: nonnegative.nullable(),
    odGreat: nonnegative.nullable(),
    odGood: nonnegative.nullable(),
    odOk: nonnegative.nullable(),
    odMeh: nonnegative.nullable(),
  })
  .strict();

const difficultyCommon = {
  stars: nonnegative,
  isConvert: z.boolean(),
  maxCombo: count,
};

const OsuDifficultySchema = z
  .object({
    ...difficultyCommon,
    mode: z.literal(0),
    aim: nonnegative,
    aimDifficultSliderCount: nonnegative,
    speed: nonnegative,
    flashlight: nonnegative,
    sliderFactor: nonnegative,
    aimTopWeightedSliderFactor: nonnegative,
    speedTopWeightedSliderFactor: nonnegative,
    speedNoteCount: nonnegative,
    aimDifficultStrainCount: nonnegative,
    speedDifficultStrainCount: nonnegative,
    nestedScorePerObject: nonnegative,
    legacyScoreBaseMultiplier: nonnegative,
    maximumLegacyComboScore: nonnegative,
    hp: finite,
    nCircles: count,
    nSliders: count,
    nLargeTicks: count,
    nSpinners: count,
    ar: finite,
    greatHitWindow: nonnegative,
    okHitWindow: nonnegative,
    mehHitWindow: nonnegative,
  })
  .strict();

const TaikoDifficultySchema = z
  .object({
    ...difficultyCommon,
    mode: z.literal(1),
    stamina: nonnegative,
    rhythm: nonnegative,
    color: nonnegative,
    reading: nonnegative,
    greatHitWindow: nonnegative,
    okHitWindow: nonnegative,
    monoStaminaFactor: nonnegative,
    mechanicalDifficulty: nonnegative,
    consistencyFactor: nonnegative,
  })
  .strict();

const CatchDifficultySchema = z
  .object({
    ...difficultyCommon,
    mode: z.literal(2),
    nFruits: count,
    nDroplets: count,
    nTinyDroplets: count,
    preempt: nonnegative,
  })
  .strict();

const ManiaDifficultySchema = z
  .object({
    ...difficultyCommon,
    mode: z.literal(3),
    nObjects: count,
    nHoldNotes: count,
  })
  .strict();

export const BeatmapDifficultyPayloadSchema = z
  .object({
    version: z.literal(CALCULATION_FORMAT_VERSION),
    mode: modeSchema,
    isConvert: z.boolean(),
    keyCount: count.positive().nullable(),
    attributes: z.discriminatedUnion('mode', [
      OsuDifficultySchema,
      TaikoDifficultySchema,
      CatchDifficultySchema,
      ManiaDifficultySchema,
    ]),
  })
  .strict()
  .superRefine((payload, ctx) => {
    if (
      payload.mode !== payload.attributes.mode ||
      payload.isConvert !== payload.attributes.isConvert
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Difficulty metadata does not match its attributes',
      });
    }
    if ((payload.mode === 3) !== (payload.keyCount !== null)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Only mania difficulty has a key count',
        path: ['keyCount'],
      });
    }
  });

export const CalculatedBeatmapAttributesSchema = z
  .object({
    ar: nullableFinite,
    od: nullableFinite,
    cs: nullableFinite,
    hpDrain: nullableFinite,
    sr: nonnegative,
    bpm: nonnegative.nullable(),
    maxCombo: count.nullable(),
    clockRate: finite.min(0.01).max(100),
    totalLength: nonnegative.nullable(),
    drainLength: nonnegative.nullable(),
    hitWindows: BeatmapHitWindowsSchema,
    difficulty: BeatmapDifficultyPayloadSchema,
  })
  .strict()
  .superRefine((attributes, ctx) => {
    if (
      attributes.totalLength !== null &&
      attributes.drainLength !== null &&
      attributes.drainLength > attributes.totalLength
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Drain length cannot exceed total length',
        path: ['drainLength'],
      });
    }
    if (attributes.sr !== attributes.difficulty.attributes.stars) {
      ctx.addIssue({
        code: 'custom',
        message: 'Star rating must match the difficulty result',
        path: ['sr'],
      });
    }
  });

export type BeatmapHitWindows = z.infer<typeof BeatmapHitWindowsSchema>;
export type BeatmapDifficultyPayload = z.infer<
  typeof BeatmapDifficultyPayloadSchema
>;
export type CalculatedBeatmapAttributes = z.infer<
  typeof CalculatedBeatmapAttributesSchema
>;
