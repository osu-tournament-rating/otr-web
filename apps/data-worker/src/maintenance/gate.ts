import type { RatingRecalculationTracker } from '@otr/core/maintenance';

import type { Logger } from '../logging/logger';

/** Redelivery throttle for deferred messages; stays under RabbitMQ's ack timeout. */
export const MAINTENANCE_REQUEUE_DELAY_MS = 15_000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface DeferrableMessage {
  nack: (requeue?: boolean) => Promise<void>;
}

/** Whether the maintenance window is active; see `createRatingRecalculationTracker`. */
export type MaintenanceWindowTracker = Pick<
  RatingRecalculationTracker,
  'isPending'
>;

interface DeferOptions {
  /** Null when `MAINTENANCE_WINDOW_ENABLED=false`. */
  tracker: MaintenanceWindowTracker | null;
  message: DeferrableMessage;
  logger: Logger;
  delayMs?: number;
}

/**
 * Requeues the message during the maintenance window, which lasts until the
 * processor publishes new ratings; returns whether it deferred.
 */
export const deferIfMaintenanceWindow = async ({
  tracker,
  message,
  logger,
  delayMs = MAINTENANCE_REQUEUE_DELAY_MS,
}: DeferOptions): Promise<boolean> => {
  if (!tracker || !(await tracker.isPending())) {
    return false;
  }

  logger.info('deferring fetch during maintenance window');
  await sleep(delayMs);
  await message.nack(true);

  return true;
};
