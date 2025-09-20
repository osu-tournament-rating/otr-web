import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './apps/web/lib/db/schema.ts',
  out: './apps/web/drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
