import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

import { loadRootEnv } from '../lib/env/load-root-env';

loadRootEnv();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not set; aborting migrations.');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

(async () => {
  try {
    await migrate(db, { migrationsFolder: './apps/web/drizzle' });
    console.log('Database migrations applied successfully.');
  } catch (error) {
    console.error('Failed to run database migrations.');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
