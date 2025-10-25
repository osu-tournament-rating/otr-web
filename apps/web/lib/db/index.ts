import { dbSchema } from '@otr/core/db';
import { createRequire } from 'node:module';

type DrizzleModule = typeof import('drizzle-orm/node-postgres');

const require = createRequire(import.meta.url);
const { drizzle } = require('drizzle-orm/node-postgres') as DrizzleModule;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined');
}

export const db = drizzle(databaseUrl, {
  schema: dbSchema,
});

export type DatabaseClient = typeof db;
