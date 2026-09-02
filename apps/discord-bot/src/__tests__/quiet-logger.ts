import { mock } from 'bun:test';

import type { Logger } from '../logger';

/** A logger that records calls and prints nothing. */
export const quietLogger = () => {
  const logger = {
    debug: mock(() => undefined),
    info: mock(() => undefined),
    warn: mock(() => undefined),
    error: mock(() => undefined),
    child: () => logger,
  };
  return logger as Logger & typeof logger;
};
