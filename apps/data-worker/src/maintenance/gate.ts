import { isWithinMaintenanceWindow } from '@otr/core/maintenance';

import type { Logger } from '../logging/logger';

/** Redelivery throttle for deferred messages; stays under RabbitMQ's ack timeout. */
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
  now?: Date;
  delayMs?: number;
}

/** Requeues the message during the maintenance window; returns whether it deferred. */
export const deferIfMaintenanceWindow = async ({
  enabled,
  message,
  logger,
  now = new Date(),
  delayMs = MAINTENANCE_REQUEUE_DELAY_MS,
}: DeferOptions): Promise<boolean> => {
  if (!enabled || !isWithinMaintenanceWindow(now)) {
    return false;
  }

  logger.info('deferring fetch during maintenance window');
  await sleep(delayMs);
  await message.nack(true);

  return true;
};
