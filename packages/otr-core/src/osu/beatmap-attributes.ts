import { z } from 'zod';

import { Mods, Ruleset } from './enums';

export const CALCULATION_FORMAT_VERSION = 2;
export const MAX_CALCULATION_REQUESTS = 6;
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
const standardClockRate = z.union([z.literal(1), z.literal(1.5)]);
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
    clockRate: standardClockRate.optional(),
    lazer: z.literal(false),
  })
  .strict();

export const CalculationSettingsSchema = CalculationSettingsInputSchema.extend({
  mode: modeSchema,
  clockRate: standardClockRate,
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
  if (settings.clockRate !== (settings.mods === Mods.DoubleTime ? 1.5 : 1)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Expected the standard clock rate for this profile',
      path: ['clockRate'],
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
  .max(MAX_CALCULATION_REQUESTS)
  .refine(
    (settings) =>
      settings.every((setting) => setting.ruleset === settings[0]?.ruleset),
    {
      message: 'A calculation job must use one target ruleset',
    }
  );

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
  ruleset: Ruleset
): CalculationSettings[] {
  return normalizeCalculationRequests(
    defaultProfiles[rulesetSchema.parse(ruleset)].map((mods) => ({
      ruleset,
      mods,
      lazer: false,
    }))
  );
}

/** Adjusts existing metadata lengths; these are not calculated from the source file. */
export function getBeatmapMetadataLengths(
  metadata: { totalLength: number | null; drainLength: number | null },
  mods: number
) {
  const { clockRate } = normalizeCalculationSettings({
    ruleset: Ruleset.Osu,
    mods,
    lazer: false,
  });
  const adjust = (length: number | null) =>
    length === null ? null : nonnegative.parse(length) / clockRate;
  return {
    totalLength: adjust(metadata.totalLength),
    drainLength: adjust(metadata.drainLength),
  };
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

const difficultyVersion = z.literal(CALCULATION_FORMAT_VERSION);

const OsuDifficultySchema = z
  .object({
    version: difficultyVersion,
    mode: z.literal(0),
    aim: nonnegative,
    speed: nonnegative,
    flashlight: nonnegative,
    nCircles: count,
    nSliders: count,
    nSpinners: count,
  })
  .strict();

const TaikoDifficultySchema = z
  .object({
    version: difficultyVersion,
    mode: z.literal(1),
    stamina: nonnegative,
    rhythm: nonnegative,
    color: nonnegative,
    reading: nonnegative,
  })
  .strict();

const CatchDifficultySchema = z
  .object({
    version: difficultyVersion,
    mode: z.literal(2),
    nFruits: count,
    nDroplets: count,
    nTinyDroplets: count,
  })
  .strict();

const ManiaDifficultySchema = z
  .object({
    version: difficultyVersion,
    mode: z.literal(3),
    keyCount: count.positive(),
    nObjects: count,
    nHoldNotes: count,
  })
  .strict();

export const BeatmapDifficultyPayloadSchema = z.discriminatedUnion('mode', [
  OsuDifficultySchema,
  TaikoDifficultySchema,
  CatchDifficultySchema,
  ManiaDifficultySchema,
]);

export const CalculatedBeatmapAttributesSchema = z
  .object({
    ar: nullableFinite,
    od: nullableFinite,
    cs: nullableFinite,
    hpDrain: nullableFinite,
    sr: nonnegative,
    bpm: nonnegative.nullable(),
    maxCombo: count.nullable(),
    clockRate: standardClockRate,
    hitWindows: BeatmapHitWindowsSchema,
    difficulty: BeatmapDifficultyPayloadSchema,
  })
  .strict();

export type BeatmapHitWindows = z.infer<typeof BeatmapHitWindowsSchema>;
export type BeatmapDifficultyPayload = z.infer<
  typeof BeatmapDifficultyPayloadSchema
>;
export type CalculatedBeatmapAttributes = z.infer<
  typeof CalculatedBeatmapAttributesSchema
>;
