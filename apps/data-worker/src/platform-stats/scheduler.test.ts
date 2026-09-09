import { describe, expect, it, mock } from 'bun:test';
import { Ruleset } from '@otr/core/osu';

import type { DatabaseClient } from '../db';
import type { Logger } from '../logging/logger';
import { PlayerStatsScheduler } from './scheduler';

const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => noopLogger,
};

const db = {} as DatabaseClient;
const rulesets = [Ruleset.Osu, Ruleset.Taiko, Ruleset.Catch] as const;

const insideWindow = new Date('2026-06-02T12:00:00.000Z');
const outsideWindow = new Date('2026-06-02T12:15:00.000Z');

const runFirstTick = async (scheduler: PlayerStatsScheduler) => {
  scheduler.start();
  await Bun.sleep(5);
  await scheduler.stop();
};

describe('PlayerStatsScheduler', () => {
  it('refreshes every ruleset in order on the first tick', async () => {
    const seen: Ruleset[] = [];
    const refresh = mock(async ({ ruleset }: { ruleset: Ruleset }) => {
      seen.push(ruleset);
      return { rebuilt: true, durationMs: 1 };
    });

    await runFirstTick(
      new PlayerStatsScheduler({
        db,
        logger: noopLogger,
        maintenanceWindowEnabled: true,
        rulesets,
        refresh,
        now: () => outsideWindow,
        firstTickDelayMs: 0,
      })
    );

    expect(seen).toEqual([...rulesets]);
  });

  it('skips the tick inside the maintenance window', async () => {
    const refresh = mock(async () => ({ rebuilt: false, durationMs: 0 }));

    await runFirstTick(
      new PlayerStatsScheduler({
        db,
        logger: noopLogger,
        maintenanceWindowEnabled: true,
        rulesets,
        refresh,
        now: () => insideWindow,
        firstTickDelayMs: 0,
      })
    );

    expect(refresh).not.toHaveBeenCalled();
  });

  it('keeps refreshing the remaining rulesets after one fails', async () => {
    const seen: Ruleset[] = [];
    const refresh = mock(async ({ ruleset }: { ruleset: Ruleset }) => {
      seen.push(ruleset);

      if (ruleset === Ruleset.Taiko) {
        throw new Error('build failed');
      }

      return { rebuilt: true, durationMs: 1 };
    });

    await runFirstTick(
      new PlayerStatsScheduler({
        db,
        logger: noopLogger,
        maintenanceWindowEnabled: true,
        rulesets,
        refresh,
        now: () => outsideWindow,
        firstTickDelayMs: 0,
      })
    );

    expect(seen).toEqual([...rulesets]);
  });
});
