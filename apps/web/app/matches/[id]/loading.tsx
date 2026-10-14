import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function MatchLoading() {
  return (
    <div
      role="status"
      aria-label="Loading match"
      className="container mx-auto flex flex-col gap-4 md:gap-2"
    >
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-9 w-full rounded-lg" />
      <Card className="mt-4 p-6">
        <div className="flex items-center gap-2">
          <Skeleton className="size-6" />
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-[19rem] w-full rounded-xl" />
          ))}
        </div>
      </Card>
    </div>
  );
}
