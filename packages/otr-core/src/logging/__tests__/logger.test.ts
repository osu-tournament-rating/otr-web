import { afterEach, describe, expect, it, spyOn } from 'bun:test';

import { createLogger } from '../logger';

describe('createLogger', () => {
  const originalLevel = process.env.LOG_LEVEL;

  afterEach(() => {
    if (originalLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLevel;
    }
  });

  it.each(['', '   '])('logs at info when LOG_LEVEL is %p', (level) => {
    process.env.LOG_LEVEL = level;
    const info = spyOn(console, 'info').mockImplementation(() => {});

    try {
      const logger = createLogger('test');
      logger.debug('hidden');
      logger.info('shown');

      expect(info).toHaveBeenCalledTimes(1);
      expect(String(info.mock.calls[0]?.[0])).toContain('message=shown');
    } finally {
      info.mockRestore();
    }
  });
});
