import { SessionOptions } from 'iron-session';

export const ironSessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'otr-session',
  ttl: 1_209_600,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  },
};