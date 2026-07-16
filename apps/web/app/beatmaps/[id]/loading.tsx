import { Skeleton } from '@/components/ui/skeleton';

export default function BeatmapDetailLoading() {
  return (
    <div
      role="status"
      aria-label="Loading beatmap"
      className="container mx-auto space-y-4 px-4 py-6 sm:px-0 sm:py-0"
    >
      <Skeleton className="h-[28rem] w-full rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <div className="space-y-4">
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
