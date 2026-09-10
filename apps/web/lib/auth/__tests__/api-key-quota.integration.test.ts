import { expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';

const databaseUrl = process.env.AUTH_TEST_DATABASE_URL;

test.skipIf(!databaseUrl)(
  'API key creation preserves the per-owner quota across auth and oRPC',
  async () => {
    const url = new URL(databaseUrl!);
    expect(['localhost', '127.0.0.1']).toContain(url.hostname);
    expect(process.env.CI === 'true' ? ['5432', '5434'] : ['5434']).toContain(
      url.port
    );

    // Keep real auth/database imports isolated from other tests' module mocks.
    const child = Bun.spawn(
      [
        process.execPath,
        fileURLToPath(new URL('./fixtures/api-key-quota.ts', import.meta.url)),
      ],
      {
        cwd: fileURLToPath(new URL('../../../', import.meta.url)),
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          BETTER_AUTH_URL: 'http://localhost:3000',
          BETTER_AUTH_SECRET: 'api-key-quota-integration-test-secret-only',
          E2E_TEST_AUTH: 'true',
          WEB_OSU_CLIENT_ID: 'test',
          WEB_OSU_CLIENT_SECRET: 'test',
        },
        stdout: 'pipe',
        stderr: 'pipe',
      }
    );
    const [output, errors, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect(exitCode, `${output}\n${errors}`).toBe(0);
  },
  30_000
);
