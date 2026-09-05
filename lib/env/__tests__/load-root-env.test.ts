import { expect, test } from 'bun:test';
import { fileURLToPath } from 'url';

const loaderPath = fileURLToPath(
  new URL('../load-root-env.ts', import.meta.url)
);

// Drop inherited DOTENV_CONFIG_* overrides so the loader itself must stay quiet.
const childEnv = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !key.startsWith('DOTENV_CONFIG_')
  )
);

test('loadRootEnv writes nothing to stdout', () => {
  const script = `const { loadRootEnv } = await import(${JSON.stringify(loaderPath)}); loadRootEnv();`;
  const result = Bun.spawnSync({
    cmd: [process.execPath, '-e', script],
    env: childEnv,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  expect(result.stderr.toString()).toBe('');
  expect(result.exitCode).toBe(0);
  expect(result.stdout.toString()).toBe('');
});
