import { mock } from 'bun:test';
import { AsyncLocalStorage } from 'node:async_hooks';
import { EventEmitter } from 'node:events';
import {
  trace,
  type Span,
  type SpanOptions,
  type Tracer,
} from '@opentelemetry/api';
import { call, ORPCError } from '@orpc/server';
import { OpenAPIHandler } from '@orpc/openapi/fetch';

const [scenario = 'parallel'] = process.argv.slice(2);
const sqlSpans: { statement: unknown; parentSystem: unknown }[] = [];
if (scenario === 'tracing') {
  const active = new AsyncLocalStorage<SpanOptions>();
  trace.setGlobalTracerProvider({
    getTracer: () =>
      ({
        startActiveSpan: (
          _name: string,
          options: SpanOptions,
          run: (span: Span) => unknown
        ) => {
          const statement = options.attributes?.['db.query.text'];
          if (statement) {
            sqlSpans.push({
              statement,
              parentSystem: active.getStore()?.attributes?.['rpc.system'],
            });
          }
          return active.run(options, () =>
            run({
              setAttribute() {},
              recordException() {},
              setStatus() {},
              end() {},
            } as unknown as Span)
          );
        },
      }) as Tracer,
  });
}
const keyState = {
  referenceId: 'owner',
  enabled: true,
  expiresAt: null as string | null,
};
let ownerLookups = 0;
const held = new Set<string>();
class FakeClient extends EventEmitter {
  async query(_text: string, parameters: string[]) {
    const key = parameters[0];
    if (_text.includes('pg_try_advisory_lock')) {
      const acquired = !held.has(key);
      if (acquired) held.add(key);
      return { rows: [{ acquired }] };
    }
    return { rows: [{ released: held.delete(key) }] };
  }
  release() {}
}
class FakePool extends EventEmitter {
  async query() {
    throw new Error('Coordination queries must use the checked-out client');
  }
  async connect() {
    return new FakeClient();
  }
}
mock.module('pg', () => ({ Pool: FakePool }));
let verifications = 0;
mock.module('@/lib/auth/auth', () => ({
  auth: {
    api: {
      getSession: async () => null,
      verifyApiKey: async ({ body }: { body: { key: string } }) => {
        verifications++;
        const invalidKeys: Record<string, string> = {
          disabled: 'KEY_DISABLED',
          expired: 'KEY_EXPIRED',
          limited: 'RATE_LIMITED',
        };
        if (invalidKeys[body.key]) {
          return { valid: false, error: { code: invalidKeys[body.key] } };
        }
        if (body.key === 'invalid') {
          return { valid: false, error: { code: 'INVALID_API_KEY' } };
        }
        return {
          valid: true,
          key: {
            id: body.key,
            referenceId: 'owner',
            enabled: keyState.enabled,
            expiresAt: keyState.expiresAt,
            name: null,
          },
        };
      },
    },
  },
}));
mock.module('@/lib/db', () => ({
  db: {
    query: {
      apiKeys: {
        findFirst: async () => {
          ownerLookups++;
          if (
            ownerLookups === 2 &&
            (scenario === 'reenabled' || scenario === 'expiry-extended')
          ) {
            keyState.enabled = scenario !== 'reenabled';
            keyState.expiresAt =
              scenario === 'expiry-extended' ? '2000-01-01T00:00:00Z' : null;
            const snapshot = { ...keyState };
            // Model an authorized update after the preflight read and before
            // Better Auth rereads the key during verification.
            keyState.enabled = true;
            keyState.expiresAt = null;
            return snapshot;
          }
          return { ...keyState };
        },
      },
      auth_users: { findFirst: async () => null },
    },
  },
}));
const metric = { labels: () => ({ inc() {}, observe() {} }) };
mock.module('@/lib/metrics', () => ({
  orpcProcedureCalls: metric,
  orpcProcedureDuration: metric,
}));
const { publicProcedure } = await import('@/app/server/oRPC/procedures/base');
const makeHeaders = (value: string) =>
  new Headers(
    scenario === 'x-api-key' ? { 'x-api-key': value } : { authorization: value }
  );
if (scenario === 'tracing') {
  const procedure = publicProcedure.handler(() => 'ok');
  await call(procedure, undefined, {
    context: { headers: new Headers({ authorization: 'Bearer key-one' }) },
  });
  console.log(JSON.stringify(sqlSpans));
} else if (scenario === 'transports') {
  let started!: () => void;
  const entered = new Promise<void>((resolve) => {
    started = resolve;
  });
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  let handlers = 0;
  const procedure = publicProcedure
    .route({ method: 'GET', path: '/probe' })
    .handler(async () => {
      handlers++;
      if (handlers === 1) {
        started();
        await pending;
      }
      return 'ok';
    });
  const router = { probe: procedure };
  const openAPIHandler = new OpenAPIHandler(router);
  mock.module('@/app/server/openapi', () => ({ openAPIHandler }));
  mock.module('@/app/server/oRPC/router', () => ({ router }));
  const { GET: apiGet } = await import('@/app/api/[[...openapi]]/route');
  const { GET: rpcGet } = await import('@/app/rpc/[[...rest]]/route');
  const controller = new AbortController();
  const first = apiGet(
    new Request('https://test.invalid/api/probe', {
      headers: { authorization: 'bEaReR key-one' },
      signal: controller.signal,
    })
  );
  await entered;
  const parallel = await rpcGet(
    new Request('https://test.invalid/rpc/probe', {
      headers: { 'x-api-key': 'key-two' },
    })
  );
  controller.abort();
  const aborted = await apiGet(
    new Request('https://test.invalid/api/probe', {
      headers: { 'x-api-key': 'key-two' },
    })
  );
  finish();
  const completed = await first;
  const resumed = await rpcGet(
    new Request('https://test.invalid/rpc/probe', {
      headers: { authorization: 'Bearer key-two' },
    })
  );
  const anonymousApi = await apiGet(
    new Request('https://test.invalid/api/probe')
  );
  console.log(
    JSON.stringify({
      parallel: parallel.status,
      aborted: aborted.status,
      completed: completed.status,
      resumed: resumed.status,
      anonymousApi: anonymousApi.status,
      handlers,
      verifications,
    })
  );
} else if (scenario === 'errors') {
  const procedure = publicProcedure.handler(() => {
    throw new ORPCError('NOT_FOUND', { message: 'Missing entity' });
  });
  const statuses: number[] = [];
  for (const token of [
    'key-one',
    'key-one',
    'invalid',
    'invalid',
    'disabled',
    'expired',
    'limited',
  ]) {
    try {
      await call(procedure, undefined, {
        context: { headers: new Headers({ authorization: `Bearer ${token}` }) },
      });
    } catch (error) {
      statuses.push((error as { status: number }).status);
    }
  }
  console.log(JSON.stringify({ statuses, verifications }));
} else if (scenario === 'invalid' || scenario === 'x-api-key') {
  const headers = makeHeaders(
    scenario === 'invalid' ? 'bEaReR invalid' : 'invalid'
  );
  let handlers = 0;
  const procedure = publicProcedure.handler(() => {
    handlers++;
    return 'ok';
  });
  let status: unknown;
  try {
    await call(procedure, undefined, { context: { headers } });
  } catch (error) {
    status = (error as { status: unknown }).status;
  }
  console.log(
    JSON.stringify({ status: status ?? 200, handlers, verifications })
  );
} else {
  let started!: () => void;
  const entered = new Promise<void>((resolve) => {
    started = resolve;
  });
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  let handlers = 0;
  const procedure = publicProcedure.handler(async () => {
    handlers++;
    if (handlers === 1) {
      started();
      await pending;
    }
    return 'ok';
  });
  const headers =
    scenario === 'anonymous' ? new Headers() : makeHeaders('Bearer key-one');
  const first = call(procedure, undefined, { context: { headers } });
  await entered;
  let status = 200;
  try {
    await call(procedure, undefined, {
      context: {
        headers:
          scenario === 'anonymous'
            ? new Headers()
            : new Headers({ authorization: 'Bearer key-two' }),
      },
    });
  } catch (error) {
    status = (error as { status: number }).status;
  }
  finish();
  await first;
  const completedHandlers = handlers;
  await call(procedure, undefined, { context: { headers } });
  console.log(
    JSON.stringify({ status, completedHandlers, handlers, verifications })
  );
}
