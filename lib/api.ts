// noinspection SpellCheckingInspection

import {
  HttpValidationProblemDetails,
  IOtrApiWrapperConfiguration,
  ProblemDetails,
  Roles,
  TournamentCompactDTO,
  TournamentDTO,
} from '@osu-tournament-rating/otr-api-client';
import { AxiosHeaders } from 'axios';
import { validateAccessCredentials } from '@/app/actions/login';
import { getSession } from '@/app/actions/session';

export const apiWrapperConfiguration: IOtrApiWrapperConfiguration = {
  baseUrl: process.env.REACT_APP_API_BASE_URL as string,
  clientConfiguration: {
    headers: new AxiosHeaders()
      .setContentType('application/json')
      .set(
        'Access-Control-Allow-Origin',
        process.env.REACT_APP_ORIGIN_URL as string
      ),
  },
  postConfigureClientMethod(instance) {
    // Interceptor for handling access credentials
    instance.interceptors.request.use(
      async (config) => {
        if (!(config as any).requiresAuth) {
          return config;
        }

        // Silently update the access token if needed
        await validateAccessCredentials();
        const session = await getSession();

        // If the access token is not present after validating, abort the request
        if (!session.accessToken) {
          return Promise.reject(
            new Error('Access is required for this request')
          );
        }

        config.headers.setAuthorization(`Bearer ${session.accessToken}`);
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  },
};

/** Type guard for determining if an object is {@link ProblemDetails} */
export function isProblemDetails(obj: any): obj is ProblemDetails {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj === 'object' &&
    'title' in obj &&
    'status' in obj
  );
}

/** Type guard for determining if an object is {@link HttpValidationProblemDetails} */
export function isHttpValidationProblemDetails(
  obj: any
): obj is HttpValidationProblemDetails {
  return (
    isProblemDetails(obj) &&
    'errors' in obj &&
    typeof obj.errors === 'object' &&
    Object.values(obj.errors).every(
      (value) =>
        Array.isArray(value) && value.every((v) => typeof v === 'string')
    )
  );
}

/** Denotes if a list of scopes contains the admin scope */
export function isAdmin(scopes?: string[]) {
  return (scopes ?? []).includes(Roles.Admin);
}
