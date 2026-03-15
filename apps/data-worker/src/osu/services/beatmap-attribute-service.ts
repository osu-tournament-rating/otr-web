import { Mods, Ruleset } from '@otr/core';
import { DatabaseClient } from '../../db';
import { Logger } from '../../logging/logger';
import { BeatmapStorage } from '../beatmap-store';
import { Beatmap, Difficulty } from 'rosu-pp-js';
import { eq, sql } from 'drizzle-orm';
import * as schema from '@otr/core/db/schema';

type BeatmapAttributeRecord = typeof schema.beatmapAttributes.$inferInsert;

export interface BeatmapAttributeServiceOptions {
  db: DatabaseClient;
  beatmapStorage: BeatmapStorage;
  logger: Logger;
}

const SR_CHANGE_MODS: Mods[] = [
  Mods.Easy,
  Mods.HardRock,
  Mods.DoubleTime,
  Mods.HalfTime,
  Mods.Flashlight,
  Mods.Easy | Mods.DoubleTime,
  Mods.Easy | Mods.HalfTime,
  Mods.DoubleTime | Mods.HardRock,
  Mods.HalfTime | Mods.HardRock,
  Mods.Easy | Mods.DoubleTime | Mods.Flashlight,
  Mods.Easy | Mods.HalfTime | Mods.Flashlight,
  Mods.DoubleTime | Mods.HardRock | Mods.Flashlight,
  Mods.HalfTime | Mods.HardRock | Mods.Flashlight,
] as const;

/**
 * Produces an array of individual flags from a bitwise enumeration
 *
 * TODO: Refactor this to a shared util (from `apps/web/lib/enum-helpers.ts`)
 */
function getEnumFlags<T extends object>(
  value: number | undefined,
  enumType: T
) {
  const flags: T[keyof T][] = [];

  if (!value) {
    return flags;
  }

  for (const [enumKey, enumValue] of Object.entries(enumType)) {
    if (
      typeof enumValue === 'number' &&
      enumValue !== 0 &&
      (value & enumValue) === enumValue
    ) {
      flags.push(enumType[enumKey as keyof T]);
    }
  }

  return flags;
}

const arToMs = (ar: number): number => {
  if (ar < 5) return 1200 + (600 * (5 - ar)) / 5;
  if (ar === 5) return 1200;
  return 1200 - (750 * (ar - 5)) / 5;
};

const msToAr = (ms: number): number => {
  if (ms > 1200) return 5 - ((ms - 1200) * 5) / 600;
  if (ms === 1200) return 5;
  return 5 + ((1200 - ms) * 5) / 750;
};

export class BeatmapAttributeService {
  private readonly db: DatabaseClient;
  private readonly beatmapStorage: BeatmapStorage;
  private readonly logger: Logger;

  constructor({ db, beatmapStorage, logger }: BeatmapAttributeServiceOptions) {
    this.db = db;
    this.beatmapStorage = beatmapStorage;
    this.logger = logger;
  }

  async createAttributes(beatmapId: number): Promise<void> {
    const dbBeatmap = await this.db.query.beatmaps.findFirst({
      where: eq(schema.beatmaps.id, beatmapId),
    });

    if (!dbBeatmap) {
      this.logger.info(
        'Skipping attribute generation - could not find beatmap in database.',
        { beatmapId }
      );
      return;
    }

    const beatmapFile = await this.beatmapStorage.get(dbBeatmap.osuId);

    // Empty beatmap file means it could not be downloaded
    if (beatmapFile.byteLength === 0) {
      this.logger.info(
        'Skipping attribute generation - beatmap file does not exist.',
        {
          beatmapId,
          osuBeatmapId: dbBeatmap.osuId,
        }
      );
      return;
    }

    const beatmap = new Beatmap(beatmapFile);
    const attributes: BeatmapAttributeRecord[] = SR_CHANGE_MODS.map((mods) => {
      const diff = new Difficulty({ mods });
      const attr = diff.calculate(beatmap);

      return {
        beatmapId,
        mods,
        sr: attr.stars,
        ar:
          attr.ar ??
          BeatmapAttributeService.calcAproachRate(dbBeatmap.ar, mods),
        hp: attr.hp ?? BeatmapAttributeService.calcHpDrain(dbBeatmap.hp, mods),
        od: BeatmapAttributeService.calcOverallDifficulty(dbBeatmap.od, mods),
        cs: BeatmapAttributeService.calcCircleSize(dbBeatmap, mods),
        bpm: BeatmapAttributeService.calcBpm(dbBeatmap.bpm, mods),
        drainLength: BeatmapAttributeService.calcDrainTime(
          dbBeatmap.drainLength,
          mods
        ),
        totalLength: BeatmapAttributeService.calcDrainTime(
          dbBeatmap.totalLength,
          mods
        ),
      };
    });

    await this.db
      .insert(schema.beatmapAttributes)
      .values(attributes)
      .onConflictDoUpdate({
        target: [
          schema.beatmapAttributes.beatmapId,
          schema.beatmapAttributes.mods,
        ],
        set: {
          sr: sql`excluded.sr`,
          ar: sql`excluded.ar`,
          hp: sql`excluded.hp`,
          od: sql`excluded.od`,
          cs: sql`excluded.cs`,
          bpm: sql`excluded.bpm`,
          drainLength: sql`excluded.drainLength`,
          totalLength: sql`excluded.totalLength`,
        },
      });

    this.logger.info('Beatmap attributes created.', {
      beatmapId,
      osuBeatmapId: dbBeatmap.osuId,
    });

    // Manually free memory for beatmaps to avoid potential memory leaks
    // https://github.com/MaxOhn/rosu-pp-js/tree/main#beatmap
    beatmap.free();
  }

  static calcAproachRate(ar: number, mods: Mods): number {
    const flags = getEnumFlags(mods, Mods);
    const hasHR = flags.includes(Mods.HardRock);
    const hasEZ = flags.includes(Mods.Easy);
    const hasDT = flags.includes(Mods.DoubleTime);
    const hasHT = flags.includes(Mods.HalfTime);

    // HR and EZ are mutually exclusive
    if (hasHR) {
      ar = Math.min(ar * 1.4, 10);
    } else if (hasEZ) {
      ar = Math.max(ar * 0.5, 0);
    }

    // Convert to ms for DT or HT
    let arMs = arToMs(ar);
    // DT and HT are mutually exclusive
    if (hasDT) {
      arMs /= 1.5;
    } else if (hasHT) {
      arMs /= 0.75;
    }

    return msToAr(arMs);
  }

  static calcHpDrain(hp: number, mods: Mods): number {
    const flags = getEnumFlags(mods, Mods);
    const hasHR = flags.includes(Mods.HardRock);
    const hasEZ = flags.includes(Mods.Easy);

    if (hasHR) {
      hp = Math.max(hp * 1.4, 10);
    } else if (hasEZ) {
      hp /= 0.5;
    }

    return hp;
  }

  static calcOverallDifficulty(od: number, mods: Mods): number {
    // Wrapping hp function since they share the same formula
    return BeatmapAttributeService.calcHpDrain(od, mods);
  }

  static calcCircleSize(
    { cs, ruleset }: { cs: number; ruleset: Ruleset },
    mods: Mods
  ): number {
    if (ruleset === Ruleset.ManiaOther) {
      return cs;
    }

    // Wrapping hp function since they share the same formula
    return BeatmapAttributeService.calcHpDrain(cs, mods);
  }

  static calcBpm(bpm: number, mods: Mods): number {
    const flags = getEnumFlags(mods, Mods);
    const hasDT = flags.includes(Mods.DoubleTime);
    const hasHT = flags.includes(Mods.HalfTime);

    if (hasDT) {
      bpm *= 1.5;
    } else if (hasHT) {
      bpm /= 1.5;
    }

    return bpm;
  }

  static calcDrainTime(time: number, mods: Mods): number {
    // Wrapping bpm function since they share the same formula
    return BeatmapAttributeService.calcBpm(time, mods);
  }
}
