import { expect, spyOn, test } from 'bun:test';
import { loadRootEnv } from '../load-root-env';

test('loadRootEnv does not print a dotenv banner', () => {
  const log = spyOn(console, 'log');
  const error = spyOn(console, 'error');

  try {
    loadRootEnv();

    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  } finally {
    log.mockRestore();
    error.mockRestore();
  }
});
