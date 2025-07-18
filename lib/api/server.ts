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
// @deprecated - No longer used, keeping for backward compatibility during migration
export const USER_INFO_COOKIE_NAME = 'otr-user';

const config: IOtrApiWrapperConfiguration = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  postConfigureClientMethod: (instance) => {
    instance.interceptors.request.use(
      async (config) => {
        const apiHeaderKey = 'X-Api-Key';
        const apiHeaderValue = process.env.API_KEY;
        const authCookie = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

        // Always attach session cookie if it exists
        if (authCookie) {
          config.headers['Cookie'] = `${SESSION_COOKIE_NAME}=${authCookie}`;
          config.headers[apiHeaderKey] = apiHeaderValue;
        }

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
 * Fetch session from API (for use in Server Actions/Route Handlers only)
 * @returns User data, or null if fetch failed
 */
export async function fetchSession(): Promise<UserDTO | null> {
  try {
    const result = await fetchSessionData();
    return result;
  } catch (error) {
    console.error('Failed to fetch session:', error);
    return null;
  }
}

/**
 * Get the current user session by checking the session cookie and fetching from API
 * Uses caching to prevent duplicate API calls during the same request cycle
 * @returns User data or null if not authenticated
 */
export async function getSession(): Promise<UserDTO | null> {
  const cookieManager = await cookies();
  const sessionCookie = cookieManager.get(SESSION_COOKIE_NAME);

  // No session cookie means not authenticated
  if (!sessionCookie?.value) {
    return null;
  }

  // We have a session cookie, fetch the user data from the API with caching
  return withRequestCache(`get-session-${sessionCookie.value}`, async () => {
    try {
      return await fetchSessionData();
    } catch (error) {
      console.error('Failed to fetch session data:', error);
      return null;
    }
  });
}

/**
 * Get session from middleware headers or fetch if not available
 * This is used in layout to avoid duplicate API calls
 * @returns User data or null if not authenticated
 */
export async function getSessionFromHeaders(
  headers: Headers
): Promise<UserDTO | null> {
  // Check if middleware already validated and passed session data
  const sessionValidated = headers.get('x-session-validated');
  const sessionData = headers.get('x-session-data');

  if (sessionValidated === 'true' && sessionData) {
    try {
      return JSON.parse(sessionData) as UserDTO;
    } catch (error) {
      console.error('Failed to parse session data from headers:', error);
    }
  }

  // Fallback to regular session fetch if not in headers
  return getSession();
}

/**
 * Delete the session cookie
 */
export async function clearSession() {
  const cookieManager = await cookies();
  cookieManager.delete(SESSION_COOKIE_NAME);
  // Also clear any legacy otr-user cookies during migration period
  cookieManager.delete(USER_INFO_COOKIE_NAME);
}
