import { notFound } from 'next/navigation';
import { HttpValidationProblemDetails } from '@osu-tournament-rating/otr-api-client';
import { ProblemDetails } from '@osu-tournament-rating/otr-api-client';

/**
 * Automatically handles 404 status codes with a redirect
 *
 * https://nextjs.org/docs/app/api-reference/functions/not-found
 */
export const notFoundInterceptor = [
  // @ts-expect-error AxiosResponse<any, any>
  (res) => res,
  // @ts-expect-error any (axios error)
  (error) => {
    if (
      'status' in error &&
      typeof error.status === 'number' &&
      error.status === 404
    ) {
      return notFound();
    }

    return Promise.reject(error);
  },
];

/** Extends {@link HttpValidationProblemDetails} with type support */
export interface ValidationProblemDetails<T extends object>
  extends HttpValidationProblemDetails {
  errors?: {
    [key in keyof Partial<T>]: string[];
  };
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

/** Type guard for determining if an object is {@link ValidationProblemDetails} */
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
