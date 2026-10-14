import { BarChart3 } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';

export default function StatsLoading() {
  return (
    <div className="container mx-auto flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" aria-hidden="true" />
          <h1 className="text-3xl font-bold">Platform Statistics</h1>
        </div>
        <p className="text-muted-foreground">
          Statistics covering all of osu! tournaments
        </p>
      </div>
      <div
        role="status"
        aria-label="Loading statistics"
        className="flex flex-col gap-6"
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-[23.25rem] w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[25.5rem] w-full rounded-xl" />
      </div>
    </div>
  );
}
