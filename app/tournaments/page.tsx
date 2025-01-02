import TournamentListFilter from '@/components/Tournaments/TournamentList/Filter/TournamentListFilter';
import type { Metadata } from 'next';
import {
  buildTournamentListFilter,
  getTournament,
  getTournamentList,
} from '@/app/actions/tournaments';
import TournamentList from '@/components/Tournaments/TournamentList/TournamentList';
import {
  TournamentQuerySortType,
  UserDTO,
} from '@osu-tournament-rating/otr-api-client';
import {
  PaginationProps,
  SessionData,
  TournamentListFilter as TournamentListFilterType,
} from '@/lib/types';
import TournamentListDataProvider from '@/components/Context/TournamentListFilterContext/TournamentListDataContext';
import TournamentListHeader from '@/components/Tournaments/TournamentList/TournamentListHeader';
import AdminViewProvider from '@/components/Context/AdminViewContext/AdminViewContext';
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

  const isAdminUser = isAdmin(
    ((await getSessionData()) as SessionData).user?.scopes
  );

  return (
    <div className={'content'}>
      <h1>All tournaments</h1>
      <AdminViewProvider>
        {isAdminUser && <AdminViewToggle />}
        <TournamentListDataProvider
          defaultFilter={defaultFilter}
          initialFilter={requestParams}
          initialPagination={initialPagination}
          initialData={tournaments}
        >
          <TournamentListFilter />
          <TournamentListHeader />
          <TournamentList />
        </TournamentListDataProvider>
      </AdminViewProvider>
    </div>
  );
}
