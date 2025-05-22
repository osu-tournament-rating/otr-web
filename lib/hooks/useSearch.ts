'use client';

import useSWR from 'swr';
import { getSearch } from '../actions/search';

export function useSearch(query: string) {
  return useSWR(
    // ['search', query] is a key, shared globally
    ['search', query],
    async ([, searchQuery]) => {
      if (!searchQuery || searchQuery.trim() === '') {
        return undefined;
      }

      const result = await getSearch({
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
