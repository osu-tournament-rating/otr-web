'use client';

import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { TournamentListFilter } from '@/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { formatDateForFilter } from '@/lib/dates';

/**
 * Creates a {@link TournamentListFilter} containing only values
 * that differ from a default {@link TournamentListFilter}
 */
function buildFilter(
  currentFilter: TournamentListFilter,
  defaultFilter: TournamentListFilter
) {
  return Object.entries(currentFilter)
    .filter(([k, v]) => defaultFilter[k as keyof TournamentListFilter] !== v)
    .map(([k, v]) => {
      if (v instanceof Date) {
        return [k, formatDateForFilter(v)];
      }

      return [k, String(v)];
    });
}

/** Properties exposed by the {@link TournamentListFilterContext} */
type TournamentListFilterContextProps = {
  /** Current values in the filter */
  readonly filter: TournamentListFilter;

  /** Sets a value of the {@link filter} */
  setFilterValue<K extends keyof TournamentListFilter>(
    item: K,
    value: TournamentListFilter[K]
  ): void;

  /** Clears all filters */
  clearFilter(): void;
};

const TournamentListFilterContext = createContext<
  TournamentListFilterContextProps | undefined
>(undefined);

/** State manager and provider for the {@link TournamentListFilterContext} */
export default function TournamentListFilterProvider({
  initialFilter,
  defaultFilter,
  children,
}: {
  initialFilter: TournamentListFilter;
  defaultFilter: TournamentListFilter;
  children: ReactNode;
}) {
  const [filter, setFilter] = useState<TournamentListFilter>(initialFilter);

  const pathName = usePathname();
  const queryParams = useSearchParams();
  const router = useRouter();

  // Handle changes in the filter by pushing query params
  useEffect(() => {
    const builtSearchParams = new URLSearchParams(
      buildFilter(filter, defaultFilter)
    );

    if (queryParams.toString() === builtSearchParams.toString()) {
      return;
    }

    if (builtSearchParams.size > 0) {
      router.push(pathName + '?' + builtSearchParams.toString(), {
        scroll: false,
      });
    } else {
      router.push(pathName, { scroll: false });
    }
  }, [pathName, router, filter, defaultFilter, queryParams]);

  // Handle updating filter values
  const setFilterValue = <K extends keyof TournamentListFilter>(
    item: K,
    value: TournamentListFilter[K]
  ) =>
    setFilter((prevState) => ({
      ...prevState,
      [item]: value,
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

/** Hook for accessing the {@link TournamentListFilterContext} */
export function useTournamentListFilter() {
  const context = useContext(TournamentListFilterContext);

  if (!context) {
    throw new Error(
      'useTournamentListData() must be used within a TournamentListDataContext'
    );
  }

  return context;
}
