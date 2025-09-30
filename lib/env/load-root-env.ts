import { config as loadEnv } from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
let envLoaded = false;

export function loadRootEnv(): void {
  if (envLoaded) return;

  loadEnv({ path: join(projectRoot, '.env') });
  envLoaded = true;
}
