declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_API_BASE_URL: string;
    NEXT_PUBLIC_APP_BASE_URL: string;
    DATABASE_URL: string;
    IS_RESTRICTED_ENV?: string;
    API_KEY?: string;
  }
}
