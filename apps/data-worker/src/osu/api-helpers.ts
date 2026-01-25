import { APIError } from './client';
import {
  osuApiRequests,
  osuApiDuration,
  type OsuApiEndpoint,
  type OsuApiStatus,
} from '../metrics';

export const withNotFoundHandling = async <T>(
  invoke: () => Promise<T>
): Promise<T | null> => {
  try {
    return await invoke();
  } catch (error) {
    if (error instanceof APIError && error.status_code === 404) {
      return null;
    }

    throw error;
  }
};

export type ApiCallResult<T> =
  | { status: 'success'; data: T }
  | { status: 'not_found' }
  | { status: 'unauthorized' };

export const withApiErrorHandling = async <T>(
  invoke: () => Promise<T>
): Promise<ApiCallResult<T>> => {
  try {
    const data = await invoke();
    return { status: 'success', data };
  } catch (error) {
    if (error instanceof APIError) {
      if (error.status_code === 404) {
        return { status: 'not_found' };
      }
      if (error.status_code === 401 || error.status_code === 403) {
        return { status: 'unauthorized' };
      }
    }
    throw error;
  }
};

export const withApiMetrics = async <T>(
  endpoint: OsuApiEndpoint,
  invoke: () => Promise<ApiCallResult<T>>
): Promise<ApiCallResult<T>> => {
  const start = Date.now();
  let status: OsuApiStatus = 'error';

  try {
    const result = await invoke();
    status = result.status as OsuApiStatus;
    return result;
  } catch (error) {
    status = 'error';
    throw error;
  } finally {
    osuApiRequests.labels({ endpoint, status }).inc();
    osuApiDuration.labels({ endpoint }).observe((Date.now() - start) / 1000);
  }
};
