import { Music } from 'lucide-react';

import { BEATMAP_CARD_GRID_CLASS } from '@/components/beatmaps/list/layout';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function BeatmapsLoading() {
  return (
    <div className="container mx-auto px-4 py-6 sm:px-0 sm:py-0">
      <header className="mb-6 border-b pb-6">
        <div className="flex items-center gap-3">
          <Music className="size-7 text-primary" aria-hidden="true" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Beatmaps
          </h1>
        </div>
        <Skeleton className="mt-3 h-4 w-72 max-w-full" />
      </header>
      <div
        role="status"
        aria-label="Loading beatmaps"
        className="overflow-hidden rounded-xl border bg-card shadow-sm dark:bg-muted/75 dark:shadow-none"
      >
        <div className="space-y-3 border-b bg-muted/20 p-4">
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="hidden h-10 w-48 md:block" />
            <Skeleton className="size-10" />
            <Skeleton className="size-10" />
            <Skeleton className="size-10" />
          </div>
          <Skeleton className="h-8 w-96 max-w-full" />
        </div>
        <div
          className={cn(
            BEATMAP_CARD_GRID_CLASS,
            'bg-muted/10 dark:bg-background/20'
          )}
        >
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-xl border bg-card"
            >
              <div className="relative">
                <Skeleton className="aspect-[16/7] w-full rounded-none" />
                <Skeleton className="absolute top-2 left-2 h-6 w-20 rounded-full" />
                <Skeleton className="absolute top-2 right-2 h-6 w-15 rounded-full" />
              </div>
              <div className="min-w-0 p-3.5 sm:p-4">
                <div className="space-y-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3.5 w-3/5" />
                </div>
                <div className="flex flex-col gap-1.5 pt-3 sm:h-9 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex h-6 items-center sm:h-auto">
                    <Skeleton className="h-4 w-24 sm:w-28" />
                  </div>
                  <div className="flex h-6 items-center sm:h-auto">
                    <Skeleton className="h-4 w-40 sm:w-36" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
