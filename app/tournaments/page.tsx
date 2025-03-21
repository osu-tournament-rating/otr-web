import { Metadata } from 'next';
import { PageSearchParams } from '@/lib/types';
import { tournamentListFilterSchema } from '@/lib/schema';
import TournamentListFilter from '@/components/tournaments/list/TournamentListFilter';
import TournamentList from '@/components/tournaments/list/TournamentList';

export const metadata: Metadata = {
  title: 'Tournaments',
};

export default async function Page({ searchParams }: PageSearchParams) {
  const filter = tournamentListFilterSchema.parse(await searchParams);

  return (
    <div>
      <h1>Tournaments</h1>
      <div>
        <TournamentListFilter filter={filter} />
        <TournamentList filter={filter} />
      </div>
    </div>
  );
}
