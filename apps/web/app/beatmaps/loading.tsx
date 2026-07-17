import { Music } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';

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
        className="overflow-hidden rounded-xl border"
      >
        <div className="space-y-3 border-b bg-muted/20 p-4">
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-24" />
          </div>
          <Skeleton className="h-8 w-96 max-w-full" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="grid gap-3 p-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-stretch sm:gap-4 sm:p-4 lg:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)]"
            >
              <Skeleton className="h-28 w-full sm:h-full sm:min-h-28" />
              <div className="min-w-0 sm:flex sm:flex-col sm:justify-center xl:grid xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center xl:gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t pt-3 xl:mt-0 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-6">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
