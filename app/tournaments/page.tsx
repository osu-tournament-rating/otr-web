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
  SessionData,
  TournamentListFilter as TournamentListFilterType,
} from '@/lib/types';
import TournamentListFilterProvider from '@/components/Context/TournamentListFilterContext';
import AdminViewProvider from '@/components/Context/AdminViewContext';
import AdminViewToggle from '@/components/AdminViewToggle/AdminViewToggle';
import { isAdmin } from '@/lib/api';
import { getSessionData } from '@/app/actions/session';

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
  pageSize: 40,
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<object>;
}) {
  const requestParams = await buildTournamentListFilter(
    await searchParams,
    defaultFilter
  );
  const tournaments = await getTournamentList({
    ...requestParams,
    ...initialPagination,
  });

  const isAdminUser = isAdmin(
    ((await getSessionData()) as SessionData).user?.scopes
  );

  return (
    <div className={'content'}>
      <h1>All tournaments</h1>
      <AdminViewProvider>
        {isAdminUser && <AdminViewToggle />}
        <TournamentListFilterProvider
          defaultFilter={defaultFilter}
          initialFilter={requestParams}
        >
          <TournamentListFilter />
          <TournamentList tournaments={tournaments} {...initialPagination} />
        </TournamentListFilterProvider>
      </AdminViewProvider>
    </div>
  );
}
