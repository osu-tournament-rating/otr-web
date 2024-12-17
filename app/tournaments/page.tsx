import TournamentListFilter from '@/components/Tournaments/TournamentList/Filter/TournamentListFilter';
import type { Metadata } from 'next';
import {
  buildTournamentListFilter,
  getTournamentList,
} from '@/app/actions/tournaments';
import TournamentList from '@/components/Tournaments/TournamentList/TournamentList';
import { TournamentQuerySortType } from '@osu-tournament-rating/otr-api-client';
import {
  PaginationProps,
  TournamentListFilter as TournamentListFilterType,
} from '@/lib/types';
import TournamentListDataProvider from '@/components/Tournaments/TournamentList/Filter/TournamentListDataContext';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Tournaments',
};

const defaultFilter: TournamentListFilterType = {
  verified: false,
  sort: TournamentQuerySortType.StartTime,
  descending: true,
};

const initialPagination: PaginationProps = {
  page: 1,
  pageSize: 20,
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{}>;
}) {
  const requestParams = await buildTournamentListFilter(
    await searchParams,
    defaultFilter
  );
  const tournaments = await getTournamentList({
    ...requestParams,
    ...initialPagination,
  });

  return (
    <div className={'content'}>
      <h1>All tournaments</h1>
      <TournamentListDataProvider
        defaultFilter={defaultFilter}
        initialFilter={requestParams}
        initialPagination={initialPagination}
        initialData={tournaments}
      >
        <TournamentListFilter />
        <TournamentList />
      </TournamentListDataProvider>
    </div>
  );
}
