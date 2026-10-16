import { describe, expect, it } from 'bun:test';
import { sql, type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';

import { buildReportListOrder } from '../reportListOrder';

const dialect = new PgDialect();

const columns = {
  id: sql.identifier('id'),
  created: sql.identifier('created'),
  resolvedAt: sql.identifier('resolved_at'),
};

const renderOrder = (order: SQL[]) =>
  order.map((part) => dialect.sqlToQuery(part).sql);

describe('buildReportListOrder', () => {
  it('lists the newest reports first by default', () => {
    expect(
      renderOrder(buildReportListOrder(columns, undefined, undefined))
    ).toEqual(['"created" desc', '"id" desc']);
  });

  it('lists the oldest reports first when ascending', () => {
    expect(
      renderOrder(buildReportListOrder(columns, 'created', false))
    ).toEqual(['"created" asc', '"id" asc']);
  });

  it('keeps open reports last when sorting by resolution time', () => {
    expect(
      renderOrder(buildReportListOrder(columns, 'resolvedAt', undefined))
    ).toEqual(['"resolved_at" desc nulls last', '"created" desc', '"id" desc']);
    expect(
      renderOrder(buildReportListOrder(columns, 'resolvedAt', false))
    ).toEqual(['"resolved_at" asc nulls last', '"created" asc', '"id" asc']);
  });
});
