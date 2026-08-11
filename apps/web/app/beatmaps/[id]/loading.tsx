import { Skeleton } from '@/components/ui/skeleton';

export default function BeatmapDetailLoading() {
  return (
    <div
      role="status"
      aria-label="Loading beatmap"
      className="container mx-auto space-y-4 px-4 py-6 sm:px-0 sm:py-0"
    >
      {/* Mirrors the real page: header, full-width distributions card, a narrow
          sticky sidebar on the left with the records card beside it, then the
          lower two-column analytics grid. */}
      <Skeleton className="h-[23rem] w-full rounded-xl" />
      <Skeleton className="h-[66rem] w-full rounded-xl lg:h-[37rem]" />
      <div className="grid items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <Skeleton className="h-[13rem] w-full rounded-xl" />
          <Skeleton className="h-[27rem] w-full rounded-xl" />
        </div>
        <Skeleton className="h-[36rem] w-full rounded-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[24rem] w-full rounded-xl lg:col-span-2" />
        <Skeleton className="h-[27rem] w-full rounded-xl lg:col-span-2" />
        <Skeleton className="h-[23rem] w-full rounded-xl" />
        <Skeleton className="h-[23rem] w-full rounded-xl" />
        <Skeleton className="h-[26rem] w-full rounded-xl lg:col-span-2" />
      </div>
    </div>
  );
}
