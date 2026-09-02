declare namespace NodeJS {
  interface ProcessEnv {
    DISCORD_BOT_TOKEN?: string;
    DISCORD_BOT_GUILD_ID?: string;
    INTERNAL_APP_BASE_URL?: string;
    NEXT_PUBLIC_APP_BASE_URL: string;
    METRICS_PORT?: string;
  }
}
