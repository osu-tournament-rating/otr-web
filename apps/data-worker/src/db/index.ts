import { drizzle } from 'drizzle-orm/node-postgres';
import { dbSchema } from '@otr/core/db';

import { loadRootEnv } from '../../../../lib/env/load-root-env';

loadRootEnv();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured');
}

export const db = drizzle(databaseUrl, {
  schema: dbSchema,
});

export type DatabaseClient = typeof db;
