import TournamentCard from '@/components/tournaments/TournamentCard';
import { tournaments } from '@/lib/api';
import { TournamentQuerySortType } from '@osu-tournament-rating/otr-api-client';
import { Metadata } from 'next';
import {
  PageSearchParams,
  PaginationParams,
  TournamentListFilter,
} from '@/lib/types';
import { tournamentListFilterSchema } from '@/lib/schema';
import TournamentListFilterProvider from '@/components/tournaments/list/TournamentListFilterContext';

export const metadata: Metadata = {
  title: 'Tournaments',
};

// Controls the default filter on initial visit to the page
const defaultFilter: TournamentListFilter = {
  sort: TournamentQuerySortType.StartTime,
  descending: true,
  verified: false,
};

// Controls pagination (Mainly page size - how many tournaments are requested at once)
const pagination: PaginationParams = {
  pageSize: 40,
  page: 1,
};

export default async function Page({ searchParams }: PageSearchParams) {
  // Parse query params
  const parsedParams = tournamentListFilterSchema.safeParse(await searchParams);
  // Build request
  const filter: TournamentListFilter = parsedParams.success
    ? { ...defaultFilter, ...parsedParams.data }
    : defaultFilter;

  // Request initial data
  const tournamentData = await tournaments.list({
    ...filter,
    ...pagination,
  });

  return (
    <div>
      <h1>Tournaments</h1>
      <div>
        <TournamentListFilterProvider
          initialFilter={filter}
          defaultFilter={defaultFilter}
        >
          {tournamentData.result.map((t) => (
            <div className="mt-2 flex-1" key={t.id}>
              <TournamentCard tournament={t} titleIsLink />
            </div>
          ))}
        </TournamentListFilterProvider>
      </div>
    </div>
  );
}
