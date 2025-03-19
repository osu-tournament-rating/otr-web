import { tournaments } from '@/lib/api';
import { TournamentQuerySortType } from '@osu-tournament-rating/otr-api-client';
import { Metadata } from 'next';
import {
  PageSearchParams,
  TournamentListFilter as TournamentListFilterType,
} from '@/lib/types';
import { tournamentListFilterSchema } from '@/lib/schema';
import TournamentListFilterProvider from '@/components/tournaments/list/TournamentListFilterContext';
import TournamentListFilter from '@/components/tournaments/list/TournamentListFilter';
import TournamentListSortControl from '@/components/tournaments/list/TournamentListSortControl';
import TournamentList from '@/components/tournaments/list/TournamentList';

export const metadata: Metadata = {
  title: 'Tournaments',
};

// Controls the default filter on initial visit to the page
const defaultFilter: TournamentListFilterType = {
  searchQuery: '',
  sort: TournamentQuerySortType.EndTime,
  descending: true,
  verified: false,
};

// Controls how many tournaments are requested at once
const pageSize = 30;

export default async function Page({ searchParams }: PageSearchParams) {
  // Parse query params
  const parsedFilter = tournamentListFilterSchema.safeParse(await searchParams);
  // Build request
  const filter: TournamentListFilterType = parsedFilter.success
    ? { ...defaultFilter, ...parsedFilter.data }
    : defaultFilter;

  // Request initial data
  console.log('requesting initial data');
  const { result: tournamentData } = await tournaments.list({
    ...filter,
    page: 1,
    pageSize,
  });

  return (
    <div>
      <h1>Tournaments</h1>
      <TournamentListFilterProvider
        initialFilter={filter}
        defaultFilter={defaultFilter}
      >
        <div>
          <TournamentListFilter />
          <TournamentListSortControl />
          <TournamentList initialData={tournamentData} pageSize={pageSize} />
        </div>
      </TournamentListFilterProvider>
    </div>
  );
}
