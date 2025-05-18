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
} from '@osu-tournament-rating/otr-api-client/index';
import { notFoundInterceptor } from './shared';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'otr-session';

const config: IOtrApiWrapperConfiguration = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  postConfigureClientMethod: (instance) => {
    // Add authorization header
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

export async function getSession() {
  try {
    return (await me.get()).result;
  } catch {
    return null;
  }
}

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
