import { isWithinMaintenanceWindow } from '@otr/core/maintenance';

import type { Logger } from '../logging/logger';

/**
 * How long to wait before requeuing a deferred message during the maintenance
 * window. Throttles redelivery so a single durable message under `prefetch: 1`
 * doesn't spin in a hot nack/redeliver loop, while keeping each message
 * in-flight far below RabbitMQ's consumer acknowledgement timeout.
 */
export const MAINTENANCE_REQUEUE_DELAY_MS = 15_000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface DeferrableMessage {
  nack: (requeue?: boolean) => Promise<void>;
}

interface DeferOptions {
  enabled: boolean;
  message: DeferrableMessage;
  logger: Logger;
}

/**
 * Defers external API work during the daily maintenance window (11:45–12:15
 * UTC). When the window is active the message is requeued without processing so
 * the fetch runs once the window clears, keeping osu! and osu!track calls quiet
 * while the processor runs. Returns whether the message was deferred.
 */
export const deferIfMaintenanceWindow = async ({
  enabled,
  message,
  logger,
}: DeferOptions): Promise<boolean> => {
  if (!enabled || !isWithinMaintenanceWindow(new Date())) {
    return false;
  }

  logger.info('deferring fetch during maintenance window');
  await sleep(MAINTENANCE_REQUEUE_DELAY_MS);
  await message.nack(true);

  return true;
};
