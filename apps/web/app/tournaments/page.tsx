import { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { PageSearchParams } from '@/lib/types';
import { tournamentListFilterSchema } from '@/lib/validation-schema';
import TournamentListFilter from '@/components/tournaments/list/TournamentListFilter';
import TournamentList from '@/components/tournaments/list/TournamentList';
import { Trophy, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/auth/auth';

export const metadata: Metadata = {
  title: 'Tournaments',
  description: 'Browse tournament submissions and their verification status.',
};

export default async function Page({ searchParams }: PageSearchParams) {
  const filter = tournamentListFilterSchema.parse(await searchParams);
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className="container mx-auto px-4 py-6 sm:px-0 sm:py-0">
      <header className="mb-6 flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <Trophy className="size-7 text-primary" aria-hidden="true" />
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Tournaments
            </h1>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Browse tournament submissions and their review status. Only verified
            data is included in ratings.
          </p>
        </div>

        {session && (
          <Button asChild className="w-full sm:w-auto">
            <Link href="/tournaments/submit">
              <Upload aria-hidden="true" />
              Submit
            </Link>
          </Button>
        )}
      </header>

      <section
        aria-label="Tournament archive"
        data-testid="tournament-results"
        className="overflow-hidden rounded-xl border bg-card shadow-sm dark:bg-muted/75 dark:shadow-none"
      >
        <div className="border-b bg-muted/20 p-3 sm:p-4 dark:bg-muted">
          <TournamentListFilter filter={filter} />
        </div>
        <TournamentList filter={filter} />
      </section>
    </div>
  );
}
