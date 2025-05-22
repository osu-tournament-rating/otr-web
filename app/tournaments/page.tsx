import { Metadata } from 'next';
import { PageSearchParams } from '@/lib/types';
import { tournamentListFilterSchema } from '@/lib/schema';
import TournamentListFilter from '@/components/tournaments/list/TournamentListFilter';
import TournamentList from '@/components/tournaments/list/TournamentList';
import { Trophy } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Tournaments',
};

export default async function Page({ searchParams }: PageSearchParams) {
  const filter = tournamentListFilterSchema.parse(await searchParams);

  return (
    <div className="bg-popover my-4 rounded-lg">
      <div className="flex flex-row items-center gap-2 rounded-t-lg p-4">
        <Trophy />
        <h1 className="text-xl font-bold">Tournaments</h1>
      </div>
      <TournamentListFilter filter={filter} />
      <TournamentList filter={filter} />
    </div>
  );
}
