import { SpanKind } from '@opentelemetry/api';
import {
  ATTR_DB_COLLECTION_NAME,
  ATTR_DB_NAMESPACE,
  ATTR_DB_OPERATION_NAME,
  ATTR_DB_QUERY_TEXT,
  ATTR_DB_SYSTEM_NAME,
  DB_SYSTEM_NAME_VALUE_POSTGRESQL,
} from '@opentelemetry/semantic-conventions';

import { withSpan } from './tracer';

// Still incubating in @opentelemetry/semantic-conventions
const ATTR_DB_RESPONSE_RETURNED_ROWS = 'db.response.returned_rows';

type QueryInput = string | { text?: string } | undefined;

interface PgQueryable {
  query(...args: never[]): unknown;
}

interface PgPoolLike extends PgQueryable {
  connect(...args: never[]): unknown;
  options?: { database?: string };
}

const INSTRUMENTED = Symbol.for('otr.tracing.pg');

const OPERATION_PATTERN = /^\s*(\w+)/;
const TABLE_PATTERN = /\b(?:from|into|update|join)\s+"?([\w.]+)"?/i;

const readSql = (input: QueryInput): string => {
  if (typeof input === 'string') return input;
  return input?.text ?? '';
};

const describeQuery = (sql: string) => {
  const operation = OPERATION_PATTERN.exec(sql)?.[1]?.toUpperCase();
  const collection = TABLE_PATTERN.exec(sql)?.[1];

  return {
    operation,
    collection,
    name: [operation ?? 'query', collection].filter(Boolean).join(' '),
  };
};

const isPromise = (value: unknown): value is Promise<unknown> =>
  typeof (value as Promise<unknown>)?.then === 'function';

const rowCountOf = (result: unknown): number | undefined => {
  const count = (result as { rowCount?: unknown } | null)?.rowCount;
  return typeof count === 'number' ? count : undefined;
};

function traceQueries<T extends PgQueryable>(target: T, database?: string): T {
  const marked = target as T & { [INSTRUMENTED]?: boolean };
  if (marked[INSTRUMENTED]) {
    return target;
  }
  marked[INSTRUMENTED] = true;

  const original = target.query.bind(target) as (...args: unknown[]) => unknown;

  const traced = (...args: unknown[]) => {
    const sql = readSql(args[0] as QueryInput);

    // Callback-style calls can't be awaited; pass them straight through.
    if (!sql || typeof args[args.length - 1] === 'function') {
      return original(...args);
    }

    const { operation, collection, name } = describeQuery(sql);

    return withSpan(
      name,
      {
        kind: SpanKind.CLIENT,
        attributes: {
          [ATTR_DB_SYSTEM_NAME]: DB_SYSTEM_NAME_VALUE_POSTGRESQL,
          [ATTR_DB_NAMESPACE]: database,
          [ATTR_DB_QUERY_TEXT]: sql,
          [ATTR_DB_OPERATION_NAME]: operation,
          [ATTR_DB_COLLECTION_NAME]: collection,
        },
      },
      async (span) => {
        const result = await (original(...args) as Promise<unknown>);
        const rows = rowCountOf(result);
        if (rows !== undefined) {
          span.setAttribute(ATTR_DB_RESPONSE_RETURNED_ROWS, rows);
        }
        return result;
      }
    );
  };

  Object.defineProperty(target, 'query', { value: traced, writable: true });
  return target;
}

/**
 * Wraps a `pg.Pool` so every statement drizzle issues becomes a child span of
 * whatever is active — an oRPC procedure, a queue handler, a render. Query
 * parameters are deliberately left off the span; only SQL text and row count
 * are recorded.
 */
export function instrumentPgPool<T extends PgPoolLike>(pool: T): T {
  const database = pool.options?.database;
  const connect = pool.connect.bind(pool) as (...args: unknown[]) => unknown;

  if ((pool as { [INSTRUMENTED]?: boolean })[INSTRUMENTED]) {
    return pool;
  }

  traceQueries(pool, database);

  // Transactions run on a checked-out client, which bypasses `pool.query`.
  Object.defineProperty(pool, 'connect', {
    writable: true,
    value: (...args: unknown[]) => {
      const result = connect(...args);
      if (!isPromise(result)) {
        return result;
      }

      return result.then((client) =>
        client ? traceQueries(client as PgQueryable, database) : client
      );
    },
  });

  return pool;
}
