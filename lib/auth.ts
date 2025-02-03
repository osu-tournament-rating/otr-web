import { SessionOptions } from 'iron-session';
import { SessionData } from '@/lib/types';

export const ironSessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'otr-session',
  ttl: 1_209_600,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  },
};

export const defaultSessionData: SessionData = {
  isLogged: false
}

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