import {
  IOtrApiWrapperConfiguration,
  MeWrapper,
  OAuthWrapper,
  SearchWrapper,
  TournamentsWrapper,
} from '@osu-tournament-rating/otr-api-client';
import { auth } from '@/auth';

const configuration: IOtrApiWrapperConfiguration = {
  baseUrl: process.env.OTR_API_ROOT as string,
  postConfigureClientMethod(instance) {
    instance.interceptors.request.use(
      async (config) => {
        if (!('requiresAuth' in config) || !config.requiresAuth) {
          return config;
        }

        const session = await auth();
        // console.log('axios: auth');
        config.headers.setAuthorization(`Bearer ${session?.accessToken}`);

        return config;
      },
      (error) => Promise.reject(error)
    );
  },
};

export const oAuth = new OAuthWrapper(configuration);
export const me = new MeWrapper(configuration);
export const tournaments = new TournamentsWrapper(configuration);
export const search = new SearchWrapper(configuration);
