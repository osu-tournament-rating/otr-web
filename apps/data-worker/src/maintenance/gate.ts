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
}

/** Requeues the message during the maintenance window; returns whether it deferred. */
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
