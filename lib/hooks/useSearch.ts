import useSWR from 'swr';
import { search } from '../actions/search';
import { SearchResponseCollectionDTO } from '@osu-tournament-rating/otr-api-client';

export function useSearch(query: string) {
  return useSWR<SearchResponseCollectionDTO | undefined>(
    query ? ['search', query] : null,
    async ([, searchQuery]: [string, string]) => {
      if (!searchQuery || searchQuery.trim() === '') {
        return undefined;
      }

      try {
        return await search(searchQuery);
      } catch (error) {
        console.error('Search failed:', error);
        throw error;
      }
    },
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 3000,
    }
  );
}
