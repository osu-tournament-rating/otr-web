import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function TournamentLoading() {
  return (
    <div
      role="status"
      aria-label="Loading tournament"
      className="container mx-auto flex flex-col gap-4 md:gap-2"
    >
      <Card className="gap-4 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-28" />
        </div>
        <Skeleton className="h-7 w-3/4 sm:h-[1.875rem] md:h-[2.375rem]" />
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-40 sm:ml-auto" />
        </div>
      </Card>
      <Skeleton className="h-9 w-full rounded-lg" />
      <Card className="mt-4 p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="size-6" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="ml-auto h-8 w-60" />
          </div>
          <div className="divide-y rounded-lg border">
            {Array.from({ length: 12 }, (_, index) => (
              <div key={index} className="flex items-center gap-2 px-3 py-2">
                <Skeleton className="h-6 w-14" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="hidden h-6 w-72 md:block" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
