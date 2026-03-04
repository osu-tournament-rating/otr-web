import { Mods } from '@otr/core';
import { DatabaseClient } from '../../db';
import { Logger } from '../../logging/logger';
import { beatmapAttributes as beatmapAttributesSchema } from '@otr/core/db/schema';
import { BeatmapStorage } from '../beatmap-store';
import { Beatmap, Difficulty } from 'rosu-pp-js';
import { sql } from 'drizzle-orm';

// Note:
// Flashlight also causes SR change, but would likely double the number of attrs
// when accounting for all combinations
const SR_CHANGE_MODS: Mods[] = [
  Mods.Easy,
  Mods.HardRock,
  Mods.DoubleTime,
  Mods.HalfTime,
  // Mods.Flashlight,
  Mods.Easy | Mods.DoubleTime,
  Mods.Easy | Mods.HalfTime,
  Mods.DoubleTime | Mods.HardRock,
  Mods.HalfTime | Mods.HardRock,
] as const;

type BeatmapAttributeRecord = typeof beatmapAttributesSchema.$inferInsert;

export interface BeatmapAttributeServiceOptions {
  db: DatabaseClient;
  beatmapStorage: BeatmapStorage;
  logger: Logger;
}

export class BeatmapAttributeService {
  private readonly db: DatabaseClient;
  private readonly beatmapStorage: BeatmapStorage;
  private readonly logger: Logger;

  constructor({ db, beatmapStorage, logger }: BeatmapAttributeServiceOptions) {
    this.db = db;
    this.beatmapStorage = beatmapStorage;
    this.logger = logger;
  }

  async createAttributes(
    dbBeatmapId: number,
    osuBeatmapId: number
  ): Promise<void> {
    const beatmapFile = await this.beatmapStorage.get(osuBeatmapId);

    // Empty beatmap file means it could not be downloaded
    if (beatmapFile.byteLength === 0) {
      this.logger.info(
        'Skipping attribute generation - beatmap file does not exist.',
        {
          dbBeatmapId,
          osuBeatmapId,
        }
      );
      return;
    }

    const beatmap = new Beatmap(beatmapFile);
    const attributes: BeatmapAttributeRecord[] = SR_CHANGE_MODS.map((mods) => {
      const diff = new Difficulty({ mods });
      const attr = diff.calculate(beatmap);

      return {
        beatmapId: dbBeatmapId,
        mods,
        sr: attr.stars,
      };
    });

    await this.db
      .insert(beatmapAttributesSchema)
      .values(attributes)
      .onConflictDoUpdate({
        target: [
          beatmapAttributesSchema.beatmapId,
          beatmapAttributesSchema.mods,
        ],
        set: {
          sr: sql`excluded.sr`,
        },
      });

    this.logger.info('Beatmap attributes created.', {
      dbBeatmapId,
      osuBeatmapId,
    });

    // Manually free memory for beatmaps to avoid potential memory leaks
    // https://github.com/MaxOhn/rosu-pp-js/tree/main#beatmap
    beatmap.free();
  }
}
