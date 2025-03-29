import useSWR from 'swr';
import { search } from '../actions/search';

export function useSearch(query: string) {
  return useSWR(
    ['search', query],
    async ([, query]) => {
      if (query === '') return;
      try {
        return await search(query);
      } catch (error) {
        console.error('Search failed:', error);
      }
    },
    {
      revalidateOnFocus: false,
    }
  );
}
