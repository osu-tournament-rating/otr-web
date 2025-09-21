import { loadRootEnv } from '../../../lib/env/load-root-env';

loadRootEnv();

const requireEnv = (name: keyof NodeJS.ProcessEnv) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const osuClientIdRaw = requireEnv('DATA_WORKER_OSU_CLIENT_ID');
const osuClientId = Number.parseInt(osuClientIdRaw, 10);

if (!Number.isFinite(osuClientId)) {
  throw new Error(
    'DATA_WORKER_OSU_CLIENT_ID must be a valid integer client identifier'
  );
}

export const dataWorkerEnv = {
  osuClientId,
  osuClientSecret: requireEnv('DATA_WORKER_OSU_CLIENT_SECRET'),
} as const;

export type DataWorkerEnv = typeof dataWorkerEnv;
