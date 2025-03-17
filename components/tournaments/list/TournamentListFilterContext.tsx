'use client';

import { TournamentListFilter } from '@/lib/types';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';

/** Properties exposed by the {@link TournamentListFilterContext} */
type TournamentListFilterContextProps = {
  /** Current values in the filter */
  readonly filter: TournamentListFilter;

  /** Sets a value of the {@link filter} */
  setFilterValue<K extends keyof TournamentListFilter>(
    item: K,
    value: TournamentListFilter[K]
  ): void;

  /** Clears all filter values */
  clearFilter(): void;
};

/** Properties for creating a {@link TournamentListFilterProvider} */
type TournamentListFilterProviderProps = {
  /** Initial request filter */
  initialFilter: TournamentListFilter;

  /** Default request filter */
  defaultFilter: TournamentListFilter;
};

const TournamentListFilterContext = createContext<
  TournamentListFilterContextProps | undefined
>(undefined);

export default function TournamentListFilterProvider({
  initialFilter,
  defaultFilter,
  children,
}: TournamentListFilterProviderProps & { children: React.ReactNode }) {
  const [filter, setFilter] = useState(initialFilter);

  const pathName = usePathname();
  const queryParams = useSearchParams();
  const router = useRouter();

  // Main feature of the context, handles changes in the filter by pushing query params to the route
  useEffect(() => {
    const builtSearchParams = new URLSearchParams(
      Object.entries(filter)
        // Filter any filter properties that are default
        .filter(
          ([k, v]) => defaultFilter[k as keyof TournamentListFilter] !== v
        )
        // Format dates to strings
        .map(([k, v]) => {
          if (v instanceof Date) {
            return [k, formatTournamentListFilterDate(v)];
          }

          return [k, String(v)];
        })
    );

    // Compare current query to the built filter, do nothing if there are no changes
    if (queryParams.toString() === builtSearchParams.toString()) {
      return;
    }

    const route =
      builtSearchParams.size > 0
        ? pathName + '?' + builtSearchParams.toString()
        : pathName;

    router.push(route, { scroll: false });
  }, [pathName, router, filter, defaultFilter, queryParams]);

  // Reducer function for updating filter values
  const setFilterValue = <K extends keyof TournamentListFilter>(
    key: K,
    value: TournamentListFilter[K]
  ) =>
    setFilter((prevState) => ({
      ...prevState,
      [key]: value,
    }));

  const props: TournamentListFilterContextProps = {
    filter,

    setFilterValue,

    clearFilter: () => setFilter({}),
  };

  return (
    <TournamentListFilterContext.Provider value={props}>
      {children}
    </TournamentListFilterContext.Provider>
  );
}

/** Hook for accessing the nearest {@link TournamentListFilterContext} */
export function useTournamentListFilter() {
  const context = useContext(TournamentListFilterContext);

  if (!context) {
    throw new Error(
      'useTournamentListFilter() must be used within an instance of a TournamentListFilterProvider'
    );
  }

  return context;
}

export function formatTournamentListFilterDate(date: Date) {
  return date.toISOString().split('T')[0];
}
