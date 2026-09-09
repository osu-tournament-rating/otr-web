import { expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';

const databaseUrl = process.env.AUTH_IDENTITY_TEST_DATABASE_URL;

test.skipIf(!databaseUrl)(
  'player identity stays bound to OAuth across auth and application endpoints',
  async () => {
    const target = new URL(databaseUrl!);
    expect(['localhost', '127.0.0.1']).toContain(target.hostname);
    // CI supplies its own isolated PostgreSQL service on port 5432.
    expect(
      target.port === '5434' ||
        (process.env.CI === 'true' && target.port === '5432')
    ).toBe(true);

    // A separate process isolates the auth singleton and the E2E environment gate.
    const child = Bun.spawn(
      [
        process.execPath,
        fileURLToPath(
          new URL('./fixtures/player-identity.ts', import.meta.url)
        ),
      ],
      {
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl!,
          BETTER_AUTH_URL: 'http://localhost:3099',
          BETTER_AUTH_SECRET:
            'identity-regression-test-secret-at-least-32-chars',
          E2E_TEST_AUTH: 'true',
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
  60_000
);
