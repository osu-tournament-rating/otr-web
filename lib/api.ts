import { auth } from '@/auth';
import {
  GamesWrapper,
  IOtrApiWrapperConfiguration,
  LeaderboardsWrapper,
  MatchesWrapper,
  MeWrapper,
  OAuthWrapper,
  SearchWrapper,
  TournamentsWrapper,
  ProblemDetails,
  HttpValidationProblemDetails,
} from '@osu-tournament-rating/otr-api-client';
import { notFound } from 'next/navigation';

const configuration: IOtrApiWrapperConfiguration = {
  baseUrl: process.env.OTR_API_ROOT as string,
  postConfigureClientMethod(instance) {
    // Add authorization header
    instance.interceptors.request.use(
      async (config) => {
        if (!config.requiresAuthorization) {
          return config;
        }

        const session = await auth();
        config.headers.setAuthorization(`Bearer ${session?.accessToken}`);

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Automatically handle 404s with a redirect
    // https://nextjs.org/docs/app/api-reference/functions/not-found
    instance.interceptors.response.use(
      (res) => res,
      (error) => {
        if (
          'status' in error &&
          typeof error.status === 'number' &&
          error.status === 404
        ) {
          return notFound();
        }

        return Promise.reject(error);
      }
    );
  },
};

interface ValidationProblemDetails<T extends object>
  extends HttpValidationProblemDetails {
  errors?: { [key in keyof Partial<T>]: string[] };
}

/** Type guard for determining if an object is {@link ProblemDetails} */
export function isProblemDetails(obj: unknown): obj is ProblemDetails {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj === 'object' &&
    'title' in obj &&
    'status' in obj
  );
}

/** Type guard for determining if an object is {@link HttpValidationProblemDetails} */
export function isValidationProblemDetails<T extends object = object>(
  obj: unknown
): obj is ValidationProblemDetails<T> {
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

export const games = new GamesWrapper(configuration);
export const leaderboards = new LeaderboardsWrapper(configuration);
export const matches = new MatchesWrapper(configuration);
export const oAuth = new OAuthWrapper(configuration);
export const me = new MeWrapper(configuration);
export const search = new SearchWrapper(configuration);
export const tournaments = new TournamentsWrapper(configuration);
