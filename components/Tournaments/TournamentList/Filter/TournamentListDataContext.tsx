'use client';

import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { PaginationProps, TournamentListFilter } from '@/lib/types';
import { usePathname, useRouter } from 'next/navigation';
import {
  TournamentCompactDTO,
  TournamentDTO,
} from '@osu-tournament-rating/otr-api-client';
import { getTournament, getTournamentList } from '@/app/actions/tournaments';

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
    .map(([k, v]) => [k, String(v)]);
}

type TournamentListResult = {
  /** Tournament */
  data: TournamentDTO;

  /** If the data is "full" including optional data */
  isFullData: boolean;
};

/** Properties exposed by the {@link TournamentListDataContext} */
type TournamentListDataContextProps = {
  /** Current values in the filter */
  readonly filter: TournamentListFilter;

  /** Sets a value of the {@link filter} */
  setFilterValue<K extends keyof TournamentListFilter>(
    item: K,
    value: TournamentListFilter[K]
  ): void;

  /** Clears all filters */
  clearFilter(): void;

  /** Results */
  readonly tournaments: TournamentListResult[];

  /** If the next page is currently being requested */
  readonly isRequesting: boolean;

  /** If another page is available to be requested */
  readonly canRequestNextPage: boolean;

  /** Request the next page of tournaments */
  requestNextPage(): Promise<void>;

  /** Update the current {@link results} in place with the full data for a tournament by the list result if possible */
  requestFullData(item: TournamentListResult): Promise<void>;
};

const TournamentListDataContext = createContext<
  TournamentListDataContextProps | undefined
>(undefined);

/** State manager and provider for the {@link TournamentListDataContext} */
export default function TournamentListDataProvider({
  initialFilter,
  defaultFilter,
  initialPagination,
  initialData,
  children,
}: {
  initialFilter: TournamentListFilter;
  defaultFilter: TournamentListFilter;
  initialPagination: PaginationProps;
  initialData: (TournamentCompactDTO | TournamentDTO)[];
  children: ReactNode;
}) {
  const [filter, setFilter] = useState<TournamentListFilter>(initialFilter);
  const [results, setResults] = useState<TournamentListResult[]>(
    initialData.map((t) => ({ data: t, isFullData: false }))
  );
  const [isRequesting, setIsRequesting] = useState(false);
  const [canRequestNextPage, setCanRequestNextPage] = useState(
    initialPagination.pageSize === initialData.length
  );
  const [pagination, setPagination] = useState({
    ...initialPagination,
    page: initialPagination.page + 1,
  });

  const pathName = usePathname();
  const router = useRouter();

  // Ensure list updates when filter changes and page re-requests the initial list
  useEffect(() => {
    setResults(initialData.map((t) => ({ data: t, isFullData: false })));
  }, [initialData]);

  // Handle changes in the filter by pushing query params
  useEffect(() => {
    const searchParams = new URLSearchParams(
      buildFilter(filter, defaultFilter)
    );

    searchParams.size
      ? router.push(pathName + '?' + searchParams.toString(), { scroll: false })
      : router.push(pathName, { scroll: false });
  }, [pathName, router, filter, defaultFilter]);

  // Handle updating filter values and debouncing
  const setFilterValue = <K extends keyof TournamentListFilter>(
    item: K,
    value: TournamentListFilter[K]
  ) =>
    setFilter((prevState) => ({
      ...prevState,
      [item]: value,
    }));

  const requestNextPage = async () => {
    // Check if we can request
    if (isRequesting || !canRequestNextPage) {
      return;
    }

    setIsRequesting(true);
    try {
      // Make the request
      const nextPage = await getTournamentList({
        ...filter,
        ...pagination,
      });

      // Update pagination props
      setCanRequestNextPage(nextPage.length === pagination.pageSize);
      setPagination((prev) => ({
        ...prev,
        page: prev.page + 1,
      }));

      // Update results
      setResults((prev) => [
        ...prev,
        ...nextPage.map((t) => ({ data: t, isFullData: false })),
      ]);
    } catch (e) {
      console.log(e);
      // If there is an error, freeze infinite scrolling until refresh
      setCanRequestNextPage(false);
    } finally {
      setIsRequesting(false);
    }
  };

  const requestFullData = async (item: TournamentListResult) => {
    const { data, isFullData } = item;
    const itemIdx = results.indexOf(item);
    if (isRequesting || isFullData || itemIdx === -1) {
      return;
    }

    try {
      setIsRequesting(true);

      const fullTournament = await getTournament({
        id: data.id,
        verified: filter.verified,
      });
      // Replace the compact DTO in place with the full data
      setResults(
        results.with(itemIdx, { data: fullTournament, isFullData: true })
      );
    } catch (e) {
      // TODO: error toast
      console.log(e);
      // Even if we failed to get the full data, prevent it from being fetched again until refresh
      setResults(results.with(itemIdx, { data, isFullData: true }));
    } finally {
      setIsRequesting(false);
    }
  };

  const props: TournamentListDataContextProps = {
    filter,

    setFilterValue,

    clearFilter: () => setFilter({}),

    tournaments: results,

    isRequesting,

    canRequestNextPage,

    requestNextPage,

    requestFullData,
  };

  return (
    <TournamentListDataContext.Provider value={props}>
      {children}
    </TournamentListDataContext.Provider>
  );
}

/** Hook for accessing the {@link TournamentListDataContext} */
export function useTournamentListData() {
  const context = useContext(TournamentListDataContext);

  if (!context) {
    throw new Error(
      'useTournamentListData() must be used within a TournamentListDataContext'
    );
  }

  return context;
}
