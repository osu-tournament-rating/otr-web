declare namespace NodeJS {
  interface ProcessEnv {
    DATA_WORKER_OSU_CLIENT_ID: string;
    DATA_WORKER_OSU_CLIENT_SECRET: string;
    DATA_WORKER_OSUTRACK_REQUESTS_PER_MINUTE: string;
    DATA_WORKER_AMQP_URL: string;
    DATABASE_URL: string;
  }
}
