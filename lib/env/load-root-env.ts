import { config as loadEnv } from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
let envLoaded = false;

export function loadRootEnv(): void {
  if (envLoaded) return;

  // dotenv 17 logs an "injected env" banner to stdout unless quiet.
  loadEnv({ path: join(projectRoot, '.env'), quiet: true });
  envLoaded = true;
}
