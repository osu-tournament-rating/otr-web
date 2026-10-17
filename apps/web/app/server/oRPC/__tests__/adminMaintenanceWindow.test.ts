import { describe, expect, it } from 'bun:test';
import { isProcedure, type AnyProcedure } from '@orpc/server';

import { withMaintenanceWindowGuard } from '../procedures/base';
import { router } from '../router';

/** Admin writes allowed during the window: the reports page marks reports viewed on load. */
const UNGUARDED_ADMIN_WRITES = ['reports.markViewed'];

const collectProcedures = (
  node: unknown,
  path: string[] = []
): Array<{ path: string; procedure: AnyProcedure }> => {
  if (isProcedure(node)) {
    return [{ path: path.join('.'), procedure: node }];
  }

  return Object.entries(node as Record<string, unknown>).flatMap(
    ([key, child]) => collectProcedures(child, [...path, key])
  );
};

const adminWrites = collectProcedures(router).filter(({ procedure }) => {
  const { tags, method } = procedure['~orpc'].route;
  return tags?.includes('admin') && method !== 'GET';
});

const isGuarded = (procedure: AnyProcedure) =>
  procedure['~orpc'].middlewares.includes(withMaintenanceWindowGuard);

describe('admin writes and the maintenance window', () => {
  it('finds the admin writes in the router', () => {
    const paths = adminWrites.map(({ path }) => path);

    expect(paths).toContain('admin.massEnqueue');
    expect(paths).toContain('reports.resolve');
    expect(paths).toContain('users.admin.ban');
  });

  it('guards every admin write', () => {
    const unguarded = adminWrites
      .filter(({ path }) => !UNGUARDED_ADMIN_WRITES.includes(path))
      .filter(({ procedure }) => !isGuarded(procedure))
      .map(({ path }) => path);

    expect(unguarded).toEqual([]);
  });

  it('lists only unguarded admin writes as exceptions', () => {
    const exceptions = adminWrites
      .filter(({ path }) => UNGUARDED_ADMIN_WRITES.includes(path))
      .filter(({ procedure }) => !isGuarded(procedure))
      .map(({ path }) => path);

    expect(exceptions).toEqual(UNGUARDED_ADMIN_WRITES);
  });
});
