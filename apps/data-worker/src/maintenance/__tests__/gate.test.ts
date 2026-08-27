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

const insideWindow = new Date('2026-06-02T12:00:00.000Z');
const outsideWindow = new Date('2026-06-02T12:15:00.000Z');

const createMessage = () => ({ nack: mock(() => Promise.resolve()) });

describe('deferIfMaintenanceWindow', () => {
  it('requeues a message that arrives inside the window', async () => {
    const message = createMessage();

    const deferred = await deferIfMaintenanceWindow({
      enabled: true,
      message,
      logger: noopLogger,
      now: insideWindow,
      delayMs: 0,
    });

    expect(deferred).toBe(true);
    expect(message.nack).toHaveBeenCalledWith(true);
  });

  it('passes a message through outside the window', async () => {
    const message = createMessage();

    const deferred = await deferIfMaintenanceWindow({
      enabled: true,
      message,
      logger: noopLogger,
      now: outsideWindow,
      delayMs: 0,
    });

    expect(deferred).toBe(false);
    expect(message.nack).not.toHaveBeenCalled();
  });

  it('passes a message through when disabled inside the window', async () => {
    const message = createMessage();

    const deferred = await deferIfMaintenanceWindow({
      enabled: false,
      message,
      logger: noopLogger,
      now: insideWindow,
      delayMs: 0,
    });

    expect(deferred).toBe(false);
    expect(message.nack).not.toHaveBeenCalled();
  });
});
