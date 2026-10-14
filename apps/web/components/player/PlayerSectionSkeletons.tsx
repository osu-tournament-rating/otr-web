import { Music, Trophy } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Headings match the loaded cards so they don't shift when content arrives.

export function PlayerTournamentsSkeleton() {
  return (
    <Card role="status" aria-label="Loading tournament history">
      <CardHeader>
        <div className="flex flex-row items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" aria-hidden="true" />
          <CardTitle className="text-xl font-bold">
            Tournament History
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col space-y-4">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-[7.25rem] w-full rounded-xl" />
        ))}
      </CardContent>
    </Card>
  );
}

export function PlayerBeatmapsSkeleton() {
  return (
    <Card role="status" aria-label="Loading pooled beatmaps">
      <CardHeader>
        <div className="flex flex-row items-center gap-2">
          <Music className="h-6 w-6 text-primary" aria-hidden="true" />
          <CardTitle className="text-xl font-bold">Pooled beatmaps</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col space-y-2">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[6.25rem] w-full rounded-xl" />
        ))}
      </CardContent>
    </Card>
  );
}
