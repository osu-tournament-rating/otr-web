import { apiWrapperConfiguration } from '@/lib/api';
import {
  MatchDTO,
  MatchesGetRequestParams,
  MatchesWrapper,
  OperationType,
} from '@osu-tournament-rating/otr-api-client';

export async function getMatch(params: MatchesGetRequestParams) {
  const wrapper = new MatchesWrapper(apiWrapperConfiguration);

  const { result } = await wrapper.get(params);
  return result;
}

/**
 * Updates a match
 * @param id Match id
 * @param prop Name of the property to update
 * @param value New value for the property
 * @returns The updated match
 */
export async function patchMatchData<
  K extends keyof Omit<MatchDTO, 'games' | 'adminNotes' | 'tournament'>,
>({ id, path, value }: { id: number; path: K; value: MatchDTO[K] }) {
  const wrapper = new MatchesWrapper(apiWrapperConfiguration);
  const { result } = await wrapper.update({
    id,
    body: [
      {
        // Client code requires supplying the operation type, but it has no effect
        // 'op' however is required and needs to be a valid operation type
        operationType: OperationType.Replace,
        op: 'replace',
        path,
        value,
      },
    ],
  });

  return result;
}
