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
    <div className="my-4 rounded-lg bg-[color-mix(in_hsl,var(--background)_85%,var(--primary))]">
      <div className="flex flex-row items-center gap-2 rounded-t-lg border-b border-b-secondary-foreground bg-[color-mix(in_hsl,var(--primary)_35%,var(--background))] p-4">
        <Trophy />
        <h1 className="text-xl font-bold">Tournaments</h1>
      </div>
      <TournamentListFilter filter={filter} />
      <TournamentList filter={filter} />
    </div>
  );
}
