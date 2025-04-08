'use client';

import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { SearchWrapper } from '@osu-tournament-rating/otr-api-client';

const search = (token: string) =>
  new SearchWrapper({
    // The proxy will forward the request to the API instead of web
    baseUrl: '',
    clientConfiguration: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

export function useSearch(query: string) {
  const { data: session } = useSession();

  return useSWR(
    // ['search', query] is a key, shared globally
    ['search', query],
    async ([, searchQuery]) => {
      if (!searchQuery || searchQuery.trim() === '' || !session?.accessToken) {
        return undefined;
      }

      const { result } = await search(session.accessToken).search({ searchKey: searchQuery });
      return result;
    },
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 3000,
    }
  );
}
