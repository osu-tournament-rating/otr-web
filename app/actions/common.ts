import 'server-only';
import { OtrApiError, OtrApiResponse } from '@osu-tournament-rating/otr-api-client';
import { isAxiosError } from 'axios';
import { notFound } from 'next/navigation';
import { ServerActionError } from '@/lib/types';

/** Options that control the behavior of the action handler */
export type OtrApiWrapperActionHandlerOptions = {
  /**
   * (Optional) Automatically handle 404 Not Found errors by navigating to
   * the nearest not found boundary see {@link notFound}
   * @default true
   */
  handleNotFound?: boolean
}

export async function handleOtrApiWrapperAction<T>(
  action: () => Promise<OtrApiResponse<T>>,
  options: OtrApiWrapperActionHandlerOptions = {
    handleNotFound: false
  }
): Promise<T | ServerActionError> {
  try {
    return (await action()).result;
  } catch (error) {
    if (OtrApiError.isOtrApiError(error) || isAxiosError(error)) {
      if (options.handleNotFound && error.status === 404) {
        return notFound();
      }

      return {
        message: error.message,
        statusCode: error.status,
      };
    }

    throw error;
  }
}