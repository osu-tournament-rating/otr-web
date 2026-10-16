import { expect, test } from 'bun:test';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const loaderPath = fileURLToPath(
  new URL('../load-root-env.ts', import.meta.url)
);
const projectRoot = fileURLToPath(new URL('../../../', import.meta.url));

test('loadRootEnv loads variables without printing a dotenv banner', () => {
  const fixtureRoot = mkdtempSync(
    join(projectRoot, 'node_modules', 'otr-env-test-')
  );

  try {
    const fixtureEnvDirectory = join(fixtureRoot, 'lib', 'env');
    mkdirSync(fixtureEnvDirectory, { recursive: true });

    const fixtureLoaderPath = join(fixtureEnvDirectory, 'load-root-env.ts');
    copyFileSync(loaderPath, fixtureLoaderPath);

    const variableName = 'OTR_DOTENV_TEST_VALUE';
    writeFileSync(join(fixtureRoot, '.env'), variableName + '=loaded\n');

    const childEnv = Object.fromEntries(
      Object.entries(process.env).filter(
        ([key]) => !key.startsWith('DOTENV_CONFIG_')
      )
    );
    delete childEnv[variableName];

    const script =
      'const { loadRootEnv } = await import(' +
      JSON.stringify(fixtureLoaderPath) +
      '); loadRootEnv(); process.stdout.write(process.env.' +
      variableName +
      ' ?? "missing");';
    const result = Bun.spawnSync({
      cmd: [process.execPath, '-e', script],
      env: childEnv,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr.toString()).toBe('');
    expect(result.stdout.toString()).toBe('loaded');
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
