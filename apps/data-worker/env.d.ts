declare namespace NodeJS {
  interface ProcessEnv {
    DATA_WORKER_OSU_CLIENT_ID: string;
    DATA_WORKER_OSU_CLIENT_SECRET: string;
    DATA_WORKER_AMQP_URL: string;
    DATABASE_URL: string;
    OSU_API_RATE_LIMIT_REQUESTS: string;
    OSU_API_RATE_LIMIT_WINDOW_SECONDS: string;
    OSUTRACK_API_RATE_LIMIT_REQUESTS: string;
    OSUTRACK_API_RATE_LIMIT_WINDOW_SECONDS: string;
  }
}
