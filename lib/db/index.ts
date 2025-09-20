import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from './schema';
import * as relations from './relations';

const dbSchema = {
  ...schema,
  ...relations,
};

export const db = drizzle(process.env.DATABASE_URL!, {
  schema: dbSchema,
});

export type DatabaseClient = typeof db;
