import { Trophy } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function LeaderboardLoading() {
  return (
    <div className="container mx-auto flex flex-col gap-4 md:gap-2">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-row items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" aria-hidden="true" />
              <CardTitle className="text-xl font-bold">
                Global Leaderboard
              </CardTitle>
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div
            role="status"
            aria-label="Loading leaderboard"
            className="divide-y overflow-hidden rounded-lg border"
          >
            <Skeleton className="h-10 w-full rounded-none" />
            {Array.from({ length: 20 }, (_, index) => (
              <div key={index} className="flex h-14 items-center gap-4 px-4">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="ml-auto h-4 w-12" />
                <Skeleton className="hidden h-4 w-12 sm:block" />
                <Skeleton className="hidden h-4 w-12 md:block" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
