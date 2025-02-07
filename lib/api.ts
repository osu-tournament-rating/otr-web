// noinspection SpellCheckingInspection

import {
  HttpValidationProblemDetails,
  IOtrApiWrapperConfiguration,
  Operation,
  OperationType,
  ProblemDetails,
  Roles,
} from '@osu-tournament-rating/otr-api-client';
import { AxiosError, AxiosHeaders } from 'axios';
import { getSession } from '@/app/actions/session';
import { notFound } from 'next/navigation';

export const apiWrapperConfiguration: IOtrApiWrapperConfiguration = {
  baseUrl: process.env.REACT_APP_API_BASE_URL,
  clientConfiguration: {
    headers: new AxiosHeaders()
      .setContentType('application/json')
      .set('Access-Control-Allow-Origin', process.env.REACT_APP_ORIGIN_URL),
  },
  postConfigureClientMethod(instance) {
    // Interceptor for handling access credentials
    instance.interceptors.request.use(
      async (config) => {
        // 'requiresAuth' is a magic value set by the client lib
        if (!('requiresAuth' in config) || !config.requiresAuth) {
          return config;
        }

        const session = await getSession();
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

    instance.interceptors.response.use(
      (res) => res,
      (error) => {
        if ((error as AxiosError).status === 404) {
          return notFound();
        }

        return Promise.reject(error);
      }
    );
  },
};

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
export function isHttpValidationProblemDetails(
  obj: unknown
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

/**
 * Generate JSON Patch Replace {@link Operation}s by comparing two objects
 */
export function createPatchOperations<T extends object>(
  orig: T,
  patched: T
): Operation[] {
  return Array.from(new Set([...Object.keys(orig), ...Object.keys(patched)]))
    .filter(
      (k) =>
        typeof orig[k as keyof T] !== 'object' &&
        orig[k as keyof T] !== patched[k as keyof T]
    )
    .map<Operation>((k) => ({
      operationType: OperationType.Replace,
      op: 'replace',
      path: `/${k}`,
      value: patched[k as keyof T],
    }));
}
