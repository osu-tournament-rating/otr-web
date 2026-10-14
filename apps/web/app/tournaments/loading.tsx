import { Trophy } from 'lucide-react';

import { TournamentListSkeleton } from '@/components/tournaments/list/TournamentList';
import { Skeleton } from '@/components/ui/skeleton';

export default function TournamentsLoading() {
  return (
    <div className="container mx-auto px-4 py-6 sm:px-0 sm:py-0">
      <header className="mb-6 border-b pb-6">
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
      </header>
      <section className="overflow-clip rounded-xl border bg-card shadow-sm dark:bg-muted/75 dark:shadow-none">
        <div className="space-y-3 border-b bg-muted/20 p-3 sm:p-4 dark:bg-muted">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Skeleton className="h-10 flex-1" />
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1 md:w-44 md:flex-none" />
              <Skeleton className="size-10" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-8 w-20 rounded-full" />
            ))}
          </div>
        </div>
        <TournamentListSkeleton />
      </section>
    </div>
  );
}
