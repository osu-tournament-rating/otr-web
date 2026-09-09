import { describe, expect, test } from 'bun:test';

const run = async (scenario: string) => {
  const process = Bun.spawn({
    cmd: [
      Bun.which('bun')!,
      new URL('./fixtures/api-request-boundary.ts', import.meta.url).pathname,
      scenario,
    ],
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, status] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  expect(stderr).not.toContain('error:');
  expect(status).toBe(0);
  return JSON.parse(stdout.trim().split('\n').at(-1)!);
};

describe('API key request boundary', () => {
  test('shares ownership across both HTTP transports and retains it until aborted work settles', async () => {
    expect(await run('transports')).toEqual({
      parallel: 429,
      aborted: 429,
      completed: 200,
      resumed: 200,
      anonymousApi: 401,
      handlers: 2,
      verifications: 2,
    });
  });
  test('preserves anonymous RPC concurrency', async () => {
    expect(await run('anonymous')).toEqual({
      status: 200,
      completedHandlers: 2,
      handlers: 3,
      verifications: 0,
    });
  });
  test('preserves handler and authentication errors and releases failed requests', async () => {
    expect(await run('errors')).toEqual({
      statuses: [404, 404, 401, 401, 403, 401, 429],
      verifications: 7,
    });
  });
  test('rejects another key of the same owner before verification and allows work after release', async () => {
    expect(await run('parallel')).toEqual({
      status: 429,
      completedHandlers: 1,
      handlers: 2,
      verifications: 2,
    });
  });
  test('verifies mixed-case Bearer credentials', async () => {
    expect(await run('invalid')).toEqual({
      status: 401,
      handlers: 0,
      verifications: 1,
    });
  });
  test('verifies x-api-key credentials on RPC procedures', async () => {
    expect(await run('x-api-key')).toEqual({
      status: 401,
      handlers: 0,
      verifications: 1,
    });
  });
});
