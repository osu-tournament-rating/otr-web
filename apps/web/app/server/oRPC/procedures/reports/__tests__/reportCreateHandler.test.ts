import { describe, expect, it } from 'bun:test';

import * as schema from '@otr/core/db/schema';
import { ReportEntityType, ReportStatus } from '@otr/core/osu';

import type { DatabaseClient } from '@/lib/db';
import { ReportCreateInputSchema } from '@/lib/orpc/schema/report';

import { createReportHandler } from '../reportProcedures';

type InsertedReport = Record<string, unknown>;

class CreateReportTestDb {
  readonly queriedEntityTypes: ReportEntityType[] = [];
  insertedReport: InsertedReport | null = null;

  constructor(
    private readonly expectedEntityType: ReportEntityType,
    private readonly entityExists = true
  ) {}

  private findEntity(entityType: ReportEntityType) {
    return async () => {
      this.queriedEntityTypes.push(entityType);
      return this.entityExists && entityType === this.expectedEntityType
        ? { id: 100 }
        : undefined;
    };
  }

  query = {
    tournaments: {
      findFirst: this.findEntity(ReportEntityType.Tournament),
    },
    matches: {
      findFirst: this.findEntity(ReportEntityType.Match),
    },
    games: {
      findFirst: this.findEntity(ReportEntityType.Game),
    },
    gameScores: {
      findFirst: this.findEntity(ReportEntityType.Score),
    },
  };

  insert(table: unknown) {
    if (table !== schema.dataReports) {
      throw new Error('Unexpected insert target');
    }

    return {
      values: (values: InsertedReport) => {
        this.insertedReport = values;
        return {
          returning: () => [{ id: 321 }],
        };
      },
    };
  }
}

const reasonByEntity = {
  [ReportEntityType.Tournament]: 'missing-match-data',
  [ReportEntityType.Match]: 'incorrect-match-result',
  [ReportEntityType.Game]: 'wrong-beatmap-or-mods',
  [ReportEntityType.Score]: 'incorrect-score-value',
} as const;

const reasonLabelByEntity = {
  [ReportEntityType.Tournament]: 'Missing match data',
  [ReportEntityType.Match]: 'Incorrect match result',
  [ReportEntityType.Game]: 'Wrong beatmap or mods',
  [ReportEntityType.Score]: 'Incorrect score value',
} as const;

describe('createReportHandler', () => {
  for (const entityType of [
    ReportEntityType.Tournament,
    ReportEntityType.Match,
    ReportEntityType.Game,
    ReportEntityType.Score,
  ]) {
    it(`creates a reason-based report for entity type ${entityType}`, async () => {
      const db = new CreateReportTestDb(entityType);
      const input = ReportCreateInputSchema.parse({
        entityType,
        entityId: 100,
        reasonKey: reasonByEntity[entityType],
        additionalInformation: 'Supporting context',
      });

      const result = await createReportHandler({
        input,
        context: {
          db: db as unknown as DatabaseClient,
          session: { dbUser: { id: 42 } },
        },
      });

      expect(result).toEqual({ success: true, reportId: 321 });
      expect(db.queriedEntityTypes).toEqual([entityType]);
      expect(db.insertedReport).toEqual({
        entityType,
        entityId: 100,
        reasonKey: reasonByEntity[entityType],
        suggestedChanges: { reason: reasonLabelByEntity[entityType] },
        justification: 'Supporting context',
        status: ReportStatus.Pending,
        reporterUserId: 42,
      });
    });
  }

  it('rejects a reason belonging to another entity type', async () => {
    const db = new CreateReportTestDb(ReportEntityType.Game);
    const input = ReportCreateInputSchema.parse({
      entityType: ReportEntityType.Game,
      entityId: 100,
      reasonKey: 'incorrect-match-result',
    });

    await expect(
      createReportHandler({
        input,
        context: {
          db: db as unknown as DatabaseClient,
          session: { dbUser: { id: 42 } },
        },
      })
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    expect(db.queriedEntityTypes).toEqual([]);
    expect(db.insertedReport).toBeNull();
  });

  it('retains legacy report values during the transition', async () => {
    const db = new CreateReportTestDb(ReportEntityType.Score);
    const input = ReportCreateInputSchema.parse({
      entityType: ReportEntityType.Score,
      entityId: 100,
      suggestedChanges: { score: '500000' },
      justification: 'The imported score is wrong.',
    });

    await createReportHandler({
      input,
      context: {
        db: db as unknown as DatabaseClient,
        session: { dbUser: { id: 42 } },
      },
    });

    expect(db.insertedReport).toMatchObject({
      reasonKey: 'something-else',
      suggestedChanges: { score: '500000' },
      justification: 'The imported score is wrong.',
    });
  });

  it('rejects reports for missing entities', async () => {
    const db = new CreateReportTestDb(ReportEntityType.Match, false);
    const input = ReportCreateInputSchema.parse({
      entityType: ReportEntityType.Match,
      entityId: 100,
      reasonKey: 'invalid-match',
    });

    await expect(
      createReportHandler({
        input,
        context: {
          db: db as unknown as DatabaseClient,
          session: { dbUser: { id: 42 } },
        },
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    expect(db.insertedReport).toBeNull();
  });
});
