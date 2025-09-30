import { drizzle } from 'drizzle-orm/node-postgres';
import { dbSchema } from '@otr/core/db';

export const db = drizzle(process.env.DATABASE_URL!, {
  schema: dbSchema,
});

export type DatabaseClient = typeof db;
