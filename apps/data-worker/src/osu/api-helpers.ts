import { APIError } from './client';

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
