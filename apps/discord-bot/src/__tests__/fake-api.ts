import { mock } from 'bun:test';

import type { Api } from '../api';

/** Only the procedures a test calls need to exist. */
export const fakeApi = (overrides: Record<string, unknown>) =>
  overrides as unknown as Api;

/** A procedure that records its arguments and resolves to `result`. */
export const procedure = <T>(result: T) =>
  mock(async (..._args: unknown[]) => result);
