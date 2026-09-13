import { isWithinMaintenanceWindow } from '@otr/core/maintenance';
import type { Ruleset } from '@otr/core/osu';
import {
  PLAYER_STATS_REFRESH_MINUTES,
  PLAYER_STATS_RULESETS,
} from '@otr/core/stats/player-stats';

import type { DatabaseClient } from '../db';
import type { Logger } from '../logging/logger';
import { refreshPlayerStats } from './service';

const MS_PER_MINUTE = 60_000;

/** Grace period so the first build does not compete with worker startup. */
const FIRST_TICK_DELAY_MS = 10_000;

type TimerHandle = ReturnType<typeof setTimeout> | null;

interface PlayerStatsSchedulerOptions {
  db: DatabaseClient;
  logger: Logger;
  maintenanceWindowEnabled: boolean;
  rulesets?: readonly Ruleset[];
  intervalMinutes?: number;
  refresh?: typeof refreshPlayerStats;
  now?: () => Date;
  firstTickDelayMs?: number;
}

export class PlayerStatsScheduler {
  private readonly db: DatabaseClient;
  private readonly logger: Logger;
  private readonly maintenanceWindowEnabled: boolean;
  private readonly rulesets: readonly Ruleset[];
  private readonly intervalMinutes: number;
  private readonly refresh: typeof refreshPlayerStats;
  private readonly now: () => Date;
  private readonly firstTickDelayMs: number;

  private firstTick: TimerHandle = null;
  private interval: TimerHandle = null;
  private inFlight: Promise<void> | null = null;
  private started = false;

  constructor(options: PlayerStatsSchedulerOptions) {
    this.db = options.db;
    this.logger = options.logger;
    this.maintenanceWindowEnabled = options.maintenanceWindowEnabled;
    this.rulesets = options.rulesets ?? PLAYER_STATS_RULESETS;
    this.intervalMinutes =
      options.intervalMinutes ?? PLAYER_STATS_REFRESH_MINUTES;
    this.refresh = options.refresh ?? refreshPlayerStats;
    this.now = options.now ?? (() => new Date());
    this.firstTickDelayMs = options.firstTickDelayMs ?? FIRST_TICK_DELAY_MS;
  }

  start() {
    if (this.started) {
      throw new Error('PlayerStatsScheduler already started');
    }

    this.started = true;
    this.firstTick = setTimeout(() => {
      this.firstTick = null;
      this.interval = setInterval(() => {
        void this.runSafely();
      }, this.intervalMinutes * MS_PER_MINUTE);
      void this.runSafely();
    }, this.firstTickDelayMs);
  }

  async stop() {
    if (!this.started) {
      return;
    }

    if (this.firstTick) {
      clearTimeout(this.firstTick);
      this.firstTick = null;
    }

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    await this.inFlight?.catch(() => undefined);
    this.started = false;
  }

  private runSafely() {
    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = this.run()
      .catch((error) => {
        this.logger.error('Player statistics refresh failed', { error });
      })
      .finally(() => {
        this.inFlight = null;
      });

    return this.inFlight;
  }

  private async run() {
    const now = this.now();

    if (this.maintenanceWindowEnabled && isWithinMaintenanceWindow(now)) {
      this.logger.info(
        'Skipping player statistics refresh during maintenance window'
      );
      return;
    }

    for (const ruleset of this.rulesets) {
      try {
        const { rebuilt, durationMs } = await this.refresh({
          db: this.db,
          ruleset,
          now,
          logger: this.logger,
        });

        if (rebuilt) {
          this.logger.info('Rebuilt player statistics', {
            ruleset,
            durationMs,
          });
        }
      } catch (error) {
        this.logger.error('Failed to rebuild player statistics', {
          ruleset,
          error,
        });
      }
    }
  }
}
