import { isAbsolute } from 'node:path';

export const MAX_ATTEMPTS = 4;
export const LEASE_MS = 120_000;
export const RECONCILE_MS = 15_000;
export const PUBLISH_LEASE_MS = 60_000;
export const CALCULATOR_TIMEOUT_MS = 60_000;
export const CALCULATOR_MEMORY_BYTES = 512 * 1024 * 1024;
export { CALCULATOR_VERSION } from './calculator-version';

export function retryDelayMs(attempt: number): number | null {
  return attempt >= MAX_ATTEMPTS
    ? null
    : 15_000 * 2 ** Math.max(0, attempt - 1);
}

export function attributesEnabled(
  env: Record<string, string | undefined>
): boolean {
  const flag = env.BEATMAP_ATTRIBUTES_ENABLED ?? 'false';
  if (flag !== 'true' && flag !== 'false')
    throw new Error('BEATMAP_ATTRIBUTES_ENABLED must be true or false');
  return flag === 'true';
}

export function readAttributesConfig(env: Record<string, string | undefined>) {
  const enabled = attributesEnabled(env);
  const concurrency = Number(env.BEATMAP_ATTRIBUTES_CONCURRENCY ?? 2);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4)
    throw new Error('BEATMAP_ATTRIBUTES_CONCURRENCY must be 1..4');
  const provider = env.BEATMAP_ATTRIBUTES_STORAGE;
  const directory = env.BEATMAP_ATTRIBUTES_LOCAL_DIR;
  const bucket = env.BEATMAP_ATTRIBUTES_GCP_BUCKET;
  if (enabled && provider !== 'local' && provider !== 'gcp')
    throw new Error('Select BEATMAP_ATTRIBUTES_STORAGE=local or gcp');
  if (enabled && provider === 'local' && (!directory || !isAbsolute(directory)))
    throw new Error(
      'BEATMAP_ATTRIBUTES_LOCAL_DIR must be an absolute directory'
    );
  if (enabled && provider === 'gcp' && !bucket)
    throw new Error('BEATMAP_ATTRIBUTES_GCP_BUCKET is required');
  return { enabled, concurrency, provider, directory, bucket };
}
