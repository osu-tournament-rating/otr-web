import { loadRootEnv } from '../../../lib/env/load-root-env';

loadRootEnv();

const read = (name: keyof NodeJS.ProcessEnv) =>
  process.env[name]?.trim() || undefined;

const url = (name: keyof NodeJS.ProcessEnv) => read(name)?.replace(/\/$/, '');

const siteUrl = url('NEXT_PUBLIC_APP_BASE_URL');

if (!siteUrl) {
  throw new Error(
    'Missing required environment variable: NEXT_PUBLIC_APP_BASE_URL'
  );
}

export const env = {
  token: read('DISCORD_BOT_TOKEN'),
  guildId: read('DISCORD_BOT_GUILD_ID'),
  apiUrl: url('INTERNAL_APP_BASE_URL') ?? siteUrl,
  siteUrl,
  metricsPort: Number(read('METRICS_PORT') ?? 9091),
} as const;
