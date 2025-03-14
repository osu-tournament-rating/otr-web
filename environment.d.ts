declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * osu! oauth client id
     */
    OSU_CLIENT_ID: string;

    OTR_API_ROOT: string;

    AUTH_SECRET: string;
  }
}
