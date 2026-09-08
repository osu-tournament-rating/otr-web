import { isAbsolute } from 'node:path';
import type { GcpServiceAccountCredentials } from './storage';

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
  const credentials =
    enabled && provider === 'gcp'
      ? parseGcpCredentials(env.BEATMAP_ATTRIBUTES_GCP_CREDENTIALS)
      : undefined;
  return { enabled, concurrency, provider, directory, bucket, credentials };
}

export function parseGcpCredentials(
  raw: string | undefined
): GcpServiceAccountCredentials | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  // The value is a secret; error messages must describe the shape only.
  const invalid = () =>
    new Error(
      'BEATMAP_ATTRIBUTES_GCP_CREDENTIALS must be a service account key as JSON or base64-encoded JSON with client_email and private_key'
    );
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      value.startsWith('{')
        ? value
        : Buffer.from(value, 'base64').toString('utf8')
    );
  } catch {
    throw invalid();
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw invalid();
  const { client_email, private_key } = parsed as Record<string, unknown>;
  if (
    typeof client_email !== 'string' ||
    !client_email ||
    typeof private_key !== 'string' ||
    !private_key
  )
    throw invalid();
  return { client_email, private_key };
}
