'use client';

import useSWR from 'swr';
import { search } from '../api/client';

export function useSearch(query: string) {
  return useSWR(
    // ['search', query] is a key, shared globally
    ['search', query],
    async ([, searchQuery]) => {
      if (!searchQuery || searchQuery.trim() === '') {
        return undefined;
      }

      const { result } = await search.search({
        searchKey: searchQuery,
      });
      return result;
    },
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 3000,
    }
  );
}
