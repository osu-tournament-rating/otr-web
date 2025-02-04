import 'server-only';
import { z } from 'zod';

/** o!TR Web environment variables */
interface EnvironmentVariables {
  /** osu! OAuth client id */
  readonly REACT_APP_OSU_CLIENT_ID: string;

  /**
   * Absolute URL to the OAuth callback route
   *
   * @example
   * "http://localhost:3000/auth"
   */
  readonly REACT_APP_OSU_CALLBACK_URL: string;

  /**
   * Absolute URL to the o!TR API
   *
   * @example
   * "http://localhost:5075/api/v1"
   * @deprecated
   */
  readonly REACT_APP_API_URL: string;

  /**
   * Base URL of the o!TR API
   *
   * @example
   * "http://localhost:5075"
   */
  readonly REACT_APP_API_BASE_URL: string;

  /**
   * Base URL of the o!TR Web app
   *
   * @example
   * "http://localhost:3000"
   */
  readonly REACT_APP_ORIGIN_URL: string;

  /** Secret value used to encrypt session data */
  readonly SESSION_SECRET: string;

  /** Node environment */
  readonly NODE_ENV: string;
}

const env: EnvironmentVariables = z.object({
  REACT_APP_OSU_CLIENT_ID: z.string(),
  REACT_APP_OSU_CALLBACK_URL: z.string(),
  REACT_APP_API_URL: z.string(),
  REACT_APP_API_BASE_URL: z.string(),
  REACT_APP_ORIGIN_URL: z.string(),
  SESSION_SECRET: z.string(),
  NODE_ENV: z.string(),
}).parse(process.env);

export default env;