import { dbSchema } from '@otr/core/db';
import { instrumentPgPool } from '@otr/core/tracing';
import { createRequire } from 'node:module';

type DrizzleModule = typeof import('drizzle-orm/node-postgres');
type PgModule = typeof import('pg');

const require = createRequire(import.meta.url);
const { drizzle } = require('drizzle-orm/node-postgres') as DrizzleModule;
const { Pool } = require('pg') as PgModule;

const databaseUrl = process.env.DATABASE_URL;

export const db = drizzle(
  instrumentPgPool(new Pool({ connectionString: databaseUrl })),
  { schema: dbSchema }
);

export type DatabaseClient = typeof db;
