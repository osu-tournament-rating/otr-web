import { describe, expect, it } from 'bun:test';

import {
  ADMIN_DATA_MUTATION_FREEZE_MESSAGE,
  ensureAdminDataMutationAllowed,
  isAdminDataMutationFreezeWindow,
} from '../adminGuard';

describe('admin data mutation freeze window', () => {
  it('is active on Tuesdays from 11:45 UTC through 12:14 UTC', () => {
    expect(
      isAdminDataMutationFreezeWindow(
        new Date('2026-06-02T11:45:00.000Z')
      )
    ).toBe(true);
    expect(
      isAdminDataMutationFreezeWindow(
        new Date('2026-06-02T12:14:59.999Z')
      )
    ).toBe(true);
  });

  it('is inactive outside the Tuesday UTC window', () => {
    expect(
      isAdminDataMutationFreezeWindow(
        new Date('2026-06-02T11:44:59.999Z')
      )
    ).toBe(false);
    expect(
      isAdminDataMutationFreezeWindow(
        new Date('2026-06-02T12:15:00.000Z')
      )
    ).toBe(false);
    expect(
      isAdminDataMutationFreezeWindow(
        new Date('2026-06-03T11:45:00.000Z')
      )
    ).toBe(false);
  });

  it('throws a temporary availability error during the window', () => {
    expect(() =>
      ensureAdminDataMutationAllowed(new Date('2026-06-02T12:00:00.000Z'))
    ).toThrow(ADMIN_DATA_MUTATION_FREEZE_MESSAGE);
  });
});
