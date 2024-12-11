import TournamentListFilter from '@/components/Tournaments/TournamentList/Filter/TournamentListFilter';

export const revalidate = 60;

import type { Metadata } from 'next';
import { getTournamentList } from '@/app/actions/tournaments';
import TournamentList from '@/components/Tournaments/TournamentList/TournamentList';

export const metadata: Metadata = {
  title: 'Tournaments',
};

export default async function Page() {
  const tournaments = await getTournamentList({
    page: 1,
    pageSize: 15,
    verified: false
  });

  return (
    <div className={'content'}>
      <h1>All tournaments</h1>
      <TournamentListFilter/>
      <TournamentList tournaments={tournaments} />
    </div>
  );
}
