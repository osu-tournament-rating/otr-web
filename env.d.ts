declare namespace NodeJS {
  interface ProcessEnv {
    /** Deprecated */
    NEXT_PUBLIC_API_BASE_URL: string;
    /** Deprecated */
    NEXT_PUBLIC_APP_BASE_URL: string;
    DATABASE_URL: string;
    IS_RESTRICTED_ENV?: string;
    API_KEY?: string;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
  }
}
