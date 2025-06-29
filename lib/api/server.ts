import 'server-only';
import {
  AdminNotesWrapper,
  GameScoresWrapper,
  GamesWrapper,
  LeaderboardsWrapper,
  MatchesWrapper,
  MeWrapper,
  SearchWrapper,
  TournamentsWrapper,
  UsersWrapper,
  AuthWrapper,
  IOtrApiWrapperConfiguration,
  UserDTO,
  PlayersWrapper,
  PlatformStatsWrapper,
  FilteringWrapper,
} from '@osu-tournament-rating/otr-api-client';
import { notFoundInterceptor } from './shared';
import { cookies } from 'next/headers';
import { withRequestCache } from '@/lib/utils/request-cache';

export const SESSION_COOKIE_NAME = 'otr-session';
export const USER_INFO_COOKIE_NAME = 'otr-user';

const config: IOtrApiWrapperConfiguration = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  postConfigureClientMethod: (instance) => {
    instance.interceptors.request.use(
      async (config) => {
        if (!config.requiresAuthorization) {
          return config;
        }

        const authCookie = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
        config.headers['Cookie'] = `${SESSION_COOKIE_NAME}=${authCookie}`;

        return config;
      },
      (error) => Promise.reject(error)
    );

    instance.interceptors.response.use(...notFoundInterceptor);
  },
};

export const auth = new AuthWrapper(config);
export const adminNotes = new AdminNotesWrapper(config);
export const filtering = new FilteringWrapper(config);
export const games = new GamesWrapper(config);
export const leaderboards = new LeaderboardsWrapper(config);
export const matches = new MatchesWrapper(config);
export const me = new MeWrapper(config);
export const platformStats = new PlatformStatsWrapper(config);
export const players = new PlayersWrapper(config);
export const scores = new GameScoresWrapper(config);
export const search = new SearchWrapper(config);
export const tournaments = new TournamentsWrapper(config);
export const users = new UsersWrapper(config);

/**
 * Fetch session data from API without setting cookies
 * @returns User data, or null if fetch failed
 */
export async function fetchSessionData(): Promise<UserDTO | null> {
  try {
    const { result } = await me.get();
    return result;
  } catch (error) {
    console.error('Failed to fetch session:', error);
    return null;
  }
}

/**
 * Fetch session and store in cookie (for use in Server Actions/Route Handlers only)
 * @returns User data, or null if fetch failed
 */
export async function fetchSession(): Promise<UserDTO | null> {
  const cookieManager = await cookies();

  try {
    const result = await fetchSessionData();

    if (result) {
      // Two weeks in seconds
      const expirationSeconds = 1209600000;

      cookieManager.set(USER_INFO_COOKIE_NAME, JSON.stringify(result), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: new Date(Date.now() + expirationSeconds),
      });
    }

    return result;
  } catch (error) {
    console.error('Failed to fetch session:', error);
    return null;
  }
}

/**
 * Fetch session with caching (for non-critical operations)
 * @returns User data, or null if fetch failed
 */
export async function fetchSessionCached(): Promise<UserDTO | null> {
  return withRequestCache(
    'fetch-session',
    async () => {
      return await fetchSession();
    },
    3000
  ); // 3 second cache to prevent rapid duplicate calls
}

/**
 * Read user session cookie
 * @returns User data or null if not found
 */
export async function getSession(): Promise<UserDTO | null> {
  const cookieManager = await cookies();
  const userInfoCookie = cookieManager.get(USER_INFO_COOKIE_NAME);
  const sessionCookie = cookieManager.get(SESSION_COOKIE_NAME);

  // If we have user info cached, return it
  if (userInfoCookie?.value) {
    try {
      return JSON.parse(userInfoCookie.value) as UserDTO;
    } catch (error) {
      console.error('Failed to parse user info cookie:', error);
      // Don't try to clear cookie here - this function is called from other components.
      return null;
    }
  }

  // If we have a session cookie but no user info cookie, try to fetch the session
  // This handles the case where users access the site via external links
  if (sessionCookie?.value && !userInfoCookie?.value) {
    try {
      return await fetchSessionData();
    } catch (error) {
      console.error(
        'Failed to fetch session when user info cookie missing:',
        error
      );
      return null;
    }
  }

  // No session cookie available
  return null;
}

/**
 * Delete session and user info cookies
 */
export async function clearSession() {
  const cookieManager = await cookies();
  cookieManager.delete(SESSION_COOKIE_NAME);
  cookieManager.delete(USER_INFO_COOKIE_NAME);
}
