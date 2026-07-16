import { Disc3 } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';

export default function BeatmapsLoading() {
  return (
    <div className="container mx-auto px-4 py-6 sm:px-0 sm:py-0">
      <header className="mb-6 border-b pb-6">
        <div className="flex items-center gap-3">
          <Disc3 className="size-7 text-primary" aria-hidden="true" />
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
              className="grid gap-3 p-3 sm:grid-cols-[14rem_minmax(0,1fr)] sm:p-4 lg:grid-cols-[14rem_minmax(0,1fr)_17rem]"
            >
              <Skeleton className="h-32 w-full sm:h-24" />
              <div className="space-y-3 py-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="hidden h-16 lg:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
