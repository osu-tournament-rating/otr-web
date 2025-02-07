import { SessionOptions } from 'iron-session';
import { CookieNames, SessionData } from '@/lib/types';
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

/** Cookie options (omits name, value) */
export const defaultCookieOptions: Partial<ResponseCookie> = {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 1_209_600,
};

export const ironSessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: CookieNames.Session,
  ttl: defaultCookieOptions.maxAge,
  cookieOptions: defaultCookieOptions,
};

export const defaultSessionData: SessionData = {
  isLogged: false,
};

/**
 * Checks the expiration of a JWT (JSON Web Token)
 * @param token The token to check
 * @returns Whether or not the given token has expired
 */
export function isTokenExpired(token: string) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}
