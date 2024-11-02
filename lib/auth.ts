import { validateAccessCredentials } from '@/app/actions/login';
import { getSession } from '@/app/actions/session';
import { IOtrApiWrapperConfiguration } from '@osu-tournament-rating/otr-api-client';
import { AxiosHeaders } from 'axios';
import { SessionOptions } from 'iron-session';

export const apiWrapperConfiguration: IOtrApiWrapperConfiguration = {
  baseUrl: process.env.REACT_APP_API_BASE_URL as string,
  clientConfiguration: {
    headers: new AxiosHeaders()
      .setContentType('application/json')
      .set('Access-Control-Allow-Origin', process.env.REACT_APP_ORIGIN_URL as string)
  },
  postConfigureClientMethod(instance) {
    // Interceptor for handling access credentials
    instance.interceptors.request.use(async (config) => {
      if (!(config as any).requiresAuth) {
        return config;
      }

      // Silently update the access token if needed
      await validateAccessCredentials();
      const session = await getSession();

      // If the access token is not present after validating, abort the request
      if (!session.accessToken) {
        return Promise.reject(new Error("Access is required for this request"));
      }

      config.headers.setAuthorization(`Bearer ${session.accessToken}`);
      return config;
    }, (error) => {
      return Promise.reject(error);
    });
  },
};

export const ironSessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'otr-session',
  ttl: 1_209_600,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  },
};