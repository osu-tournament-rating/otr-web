declare namespace NodeJS {
  interface ProcessEnv {
    /** Deprecated */
    NEXT_PUBLIC_API_BASE_URL: string;
    /** Deprecated */
    NEXT_PUBLIC_APP_BASE_URL: string;
    DATABASE_URL: string;
    API_KEY?: string;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    OSU_CLIENT_ID: string;
    OSU_CLIENT_SECRET: string;
  }
}
