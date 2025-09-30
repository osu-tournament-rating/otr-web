import { defineConfig } from 'drizzle-kit';

import { loadRootEnv } from './lib/env/load-root-env';

loadRootEnv();

export default defineConfig({
  dialect: 'postgresql',
  schema: './packages/otr-core/src/db/schema.ts',
  out: './apps/web/drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
