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
            <Skeleton className="hidden h-10 w-48 md:block" />
            <Skeleton className="size-10" />
            <Skeleton className="size-10" />
            <Skeleton className="size-10" />
          </div>
          <Skeleton className="h-8 w-96 max-w-full" />
        </div>
        <div className="grid grid-cols-1 gap-3 bg-muted/10 p-3 md:grid-cols-2 md:gap-4 md:p-4 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-xl border bg-card"
            >
              <Skeleton className="aspect-[16/7] w-full rounded-none" />
              <div className="min-w-0 p-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-14" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
