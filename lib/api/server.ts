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

const SESSION_COOKIE_NAME = 'otr-session';

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

// Caching
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
  if (await storage.hasItem('session')) {
    // Cache hit
    return (await storage.getItem('session')) as UserDTO;
  }

  // Cache miss
  try {
    const { result } = await me.get();
    storage.set('session', result);

    return result;
  } catch {
    return null;
  }
}
