import { Skeleton } from '@/components/ui/skeleton';

export default function BeatmapDetailLoading() {
  return (
    <div
      role="status"
      aria-label="Loading beatmap"
      className="container mx-auto space-y-4 px-4 py-6 sm:px-0 sm:py-0"
    >
      {/* Mirrors the real page: header, the overview + distributions row, score
          distribution, tier breakdown, the closeness/misses pair, score
          scatter, then the leaderboard. */}
      <Skeleton className="h-[23rem] w-full rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[44rem] w-full rounded-xl" />
        <Skeleton className="h-[48rem] w-full rounded-xl lg:col-span-2 lg:h-[44rem]" />
      </div>
      <Skeleton className="h-[32rem] w-full rounded-xl lg:h-[23rem]" />
      <Skeleton className="h-[46rem] w-full rounded-xl lg:h-[26rem]" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[24rem] w-full rounded-xl lg:h-[22rem]" />
        <Skeleton className="h-[14rem] w-full rounded-xl lg:h-[22rem]" />
      </div>
      <Skeleton className="h-[28rem] w-full rounded-xl" />
      <Skeleton className="h-[92rem] w-full rounded-xl lg:h-[69rem]" />
    </div>
  );
}
