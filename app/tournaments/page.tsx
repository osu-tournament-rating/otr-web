import { Metadata } from 'next';
import { PageSearchParams } from '@/lib/types';
import { tournamentListFilterSchema } from '@/lib/schema';
import TournamentListFilter from '@/components/tournaments/list/TournamentListFilter';
import TournamentList from '@/components/tournaments/list/TournamentList';
import { Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Tournaments',
};

export default async function Page({ searchParams }: PageSearchParams) {
  const filter = tournamentListFilterSchema.parse(await searchParams);

  return (
    <div className="container mx-auto flex flex-col gap-4 md:gap-2">
      <Card>
        <CardHeader>
          <div className="flex flex-row items-center gap-2">
            <Trophy className="h-6 w-6" />
            <CardTitle className="text-xl font-bold">Tournaments</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <TournamentListFilter filter={filter} />
          <TournamentList filter={filter} />
        </CardContent>
      </Card>
    </div>
  );
}
