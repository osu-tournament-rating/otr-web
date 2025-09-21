import { loadRootEnv } from '../../../lib/env/load-root-env';

loadRootEnv();

const requireEnv = (name: keyof NodeJS.ProcessEnv) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const parseIntegerEnv = (name: keyof NodeJS.ProcessEnv) => {
  const raw = requireEnv(name);
  const value = Number.parseInt(raw, 10);

  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a valid integer`);
  }

  return value;
};

const osuClientId = parseIntegerEnv('DATA_WORKER_OSU_CLIENT_ID');
const osuTrackRequestsPerMinute = parseIntegerEnv(
  'DATA_WORKER_OSUTRACK_REQUESTS_PER_MINUTE'
);

if (osuTrackRequestsPerMinute <= 0) {
  throw new Error(
    'DATA_WORKER_OSUTRACK_REQUESTS_PER_MINUTE must be a positive integer'
  );
}

export const dataWorkerEnv = {
  osuClientId,
  osuClientSecret: requireEnv('DATA_WORKER_OSU_CLIENT_SECRET'),
  osuTrackRequestsPerMinute,
  osuTrackApiBaseUrl:
    process.env.DATA_WORKER_OSUTRACK_API_BASE_URL ??
    'https://osutrack-api.ameo.dev',
  amqpUrl: requireEnv('DATA_WORKER_AMQP_URL'),
} as const;

export type DataWorkerEnv = typeof dataWorkerEnv;
