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
} from '@osu-tournament-rating/otr-api-client';
import { notFoundInterceptor } from './shared';
import { cookies } from 'next/headers';
import { createStorage } from 'unstorage';

export const SESSION_COOKIE_NAME = 'otr-session';

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

// In-memory cache
const storage = createStorage();

export const auth = new AuthWrapper(config);
export const adminNotes = new AdminNotesWrapper(config);
export const games = new GamesWrapper(config);
export const leaderboards = new LeaderboardsWrapper(config);
export const matches = new MatchesWrapper(config);
export const me = new MeWrapper(config);
export const scores = new GameScoresWrapper(config);
export const search = new SearchWrapper(config);
export const tournaments = new TournamentsWrapper(config);
export const users = new UsersWrapper(config);

export async function getSession(): Promise<UserDTO | null> {
  const cookieManager = await cookies();
  const cookie = cookieManager.get(SESSION_COOKIE_NAME);

  if (cookie && (await storage.hasItem(cookie.value))) {
    // Cache hit
    return (await storage.getItem(cookie.value)) as UserDTO;
  }

  // Cache miss
  try {
    const { result } = await me.get();

    // re-fetch cookie
    const cookie = cookieManager.get(SESSION_COOKIE_NAME);

    if (cookie) {
      // Cache for next time
      storage.set(cookie.value, result);
    }

    return result;
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieManager = await cookies();
  const cookie = cookieManager.get(SESSION_COOKIE_NAME);

  if (cookie && (await storage.hasItem(cookie.value))) {
    await storage.del(cookie.value);
  }
}
