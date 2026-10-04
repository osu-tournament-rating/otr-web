import { describe, expect, it, mock } from 'bun:test';

import type { Logger } from '../../logging/logger';
import { deferIfMaintenanceWindow } from '../gate';

const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => noopLogger,
};

const trackerReporting = (pending: boolean) => ({
  isPending: mock(async () => pending),
});

const createMessage = () => ({ nack: mock(() => Promise.resolve()) });

describe('deferIfMaintenanceWindow', () => {
  it('requeues a message while new ratings are pending', async () => {
    const message = createMessage();

    const deferred = await deferIfMaintenanceWindow({
      tracker: trackerReporting(true),
      message,
      logger: noopLogger,
      delayMs: 0,
    });

    expect(deferred).toBe(true);
    expect(message.nack).toHaveBeenCalledWith(true);
  });

  it('passes a message through once new ratings are published', async () => {
    const message = createMessage();

    const deferred = await deferIfMaintenanceWindow({
      tracker: trackerReporting(false),
      message,
      logger: noopLogger,
      delayMs: 0,
    });

    expect(deferred).toBe(false);
    expect(message.nack).not.toHaveBeenCalled();
  });

  it('passes a message through when the window is disabled', async () => {
    const message = createMessage();

    const deferred = await deferIfMaintenanceWindow({
      tracker: null,
      message,
      logger: noopLogger,
      delayMs: 0,
    });

    expect(deferred).toBe(false);
    expect(message.nack).not.toHaveBeenCalled();
  });
});
