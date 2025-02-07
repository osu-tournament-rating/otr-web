declare namespace NodeJS {
  interface ProcessEnv {
    /** osu! OAuth client id */
    REACT_APP_OSU_CLIENT_ID: string;

    /**
     * Absolute URL to the OAuth callback route
     *
     * @example
     * "http://localhost:3000/auth"
     */
    REACT_APP_OSU_CALLBACK_URL: string;

    /**
     * Base URL of the o!TR API
     *
     * @example
     * "http://localhost:5075"
     */
    REACT_APP_API_BASE_URL: string;

    /**
     * Absolute URL to the o!TR API
     *
     * @example
     * "http://localhost:5075/api/v1"
     * @deprecated
     */
    REACT_APP_API_URL: string;

    /**
     * Base URL of the o!TR Web app
     *
     * @example
     * "http://localhost:3000"
     */
    REACT_APP_ORIGIN_URL: string;

    /** Secret value used to encrypt session data */
    SESSION_SECRET: string;
  }
}
