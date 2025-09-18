import {
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
} from '@osu-tournament-rating/otr-api-client';
import { notFoundInterceptor } from './shared';

const config: IOtrApiWrapperConfiguration = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  postConfigureClientMethod: (instance) => {
    instance.interceptors.request.use(
      async (config) => {
        config.withCredentials = true;

        return config;
      },
      (error) => Promise.reject(error)
    );

    instance.interceptors.response.use(...notFoundInterceptor);
  },
};

export const auth = new AuthWrapper(config);
export const games = new GamesWrapper(config);
export const leaderboards = new LeaderboardsWrapper(config);
export const matches = new MatchesWrapper(config);
export const me = new MeWrapper(config);
export const scores = new GameScoresWrapper(config);
export const search = new SearchWrapper(config);
export const tournaments = new TournamentsWrapper(config);
export const users = new UsersWrapper(config);
