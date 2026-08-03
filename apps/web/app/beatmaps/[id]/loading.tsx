import { Skeleton } from '@/components/ui/skeleton';

export default function BeatmapDetailLoading() {
  return (
    <div
      role="status"
      aria-label="Loading beatmap"
      className="container mx-auto space-y-4 px-4 py-6 sm:px-0 sm:py-0"
    >
      {/* Mirrors the real page: header, full-width mod chart, then a narrow
          sticky sidebar on the left with the records card beside it. */}
      <Skeleton className="h-[32rem] w-full rounded-xl sm:h-[28rem]" />
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
        <Skeleton className="h-[32rem] w-full rounded-xl" />
      </div>
    </div>
  );
}
