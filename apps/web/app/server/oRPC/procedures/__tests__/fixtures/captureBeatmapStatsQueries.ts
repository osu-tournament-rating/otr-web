import { mock } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';

// Keep the procedure-builder mock in a subprocess so other suites use the real API.
const builder = {
  input: () => builder,
  output: () => builder,
  route: () => builder,
  handler: (handler: unknown) => handler,
};
mock.module('../../base', () => ({ publicProcedure: builder }));
const { getBeatmapStats } = await import('../../beatmapProcedures');
const queries: { sql: string; params: unknown[] }[] = [];
const db = drizzle(async (sql, params) => {
  queries.push({ sql, params });
  return { rows: queries.length === 1 ? [[1]] : [] };
});
const handler = getBeatmapStats as unknown as (input: {
  input: { id: number; keyType: 'otr' };
  context: { db: typeof db };
}) => Promise<unknown>;
const originalError = console.error;
console.error = () => {};
try {
  await handler({ input: { id: 1, keyType: 'otr' }, context: { db } });
} catch {
  // The capture database intentionally supplies no beatmap details after query collection.
} finally {
  console.error = originalError;
}
console.log(JSON.stringify(queries));
