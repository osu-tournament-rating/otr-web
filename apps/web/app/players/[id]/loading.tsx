import {
  PlayerBeatmapsSkeleton,
  PlayerTournamentsSkeleton,
} from '@/components/player/PlayerSectionSkeletons';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function PlayerLoading() {
  return (
    <div
      role="status"
      aria-label="Loading player"
      className="container mx-auto flex flex-col gap-4 md:gap-2"
    >
      <Card className="p-6">
        <div className="flex flex-row flex-wrap justify-between gap-4 rounded-xl bg-popover p-4">
          <div className="flex min-w-[250px] flex-1 items-center gap-3">
            <Skeleton className="size-16 rounded-full" />
            <Skeleton className="h-8 w-44" />
          </div>
          <div className="flex items-center gap-1 p-1">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="size-10 rounded-md" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <Skeleton className="col-span-2 h-20 rounded-lg md:col-span-3 lg:col-span-2" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="col-span-2 h-20 rounded-lg md:col-span-3 lg:col-span-2" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </Card>
      <Skeleton className="h-[34rem] w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-2">
        <Skeleton className="h-[23rem] w-full rounded-xl" />
        <Skeleton className="h-[23rem] w-full rounded-xl" />
        <Skeleton className="h-[26rem] w-full rounded-xl" />
        <Skeleton className="h-[26rem] w-full rounded-xl" />
      </div>
      <PlayerTournamentsSkeleton />
      <PlayerBeatmapsSkeleton />
    </div>
  );
}
