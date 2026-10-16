import { SkeletonText } from '@/components/kit/feedback/Skeletons';

/**
 * Game cards while the games list loads: the recessed frame with its cover
 * header, two score cards and the result line, at their loaded heights.
 */
export function GameFramesSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex flex-col gap-2 rounded-xl border bg-game-frame p-3"
        >
          <span
            data-slot="skeleton"
            className="block h-32 animate-pulse rounded-xl bg-accent"
          />
          <div className="flex flex-col gap-1 lg:flex-row">
            {[0, 1].map((card) => (
              <div
                key={card}
                className="flex h-[4.375rem] flex-col justify-center gap-2 rounded-lg border bg-score-card px-3 sm:h-[5.375rem] lg:flex-1"
              >
                <SkeletonText className="w-40" />
                <SkeletonText className="h-3 w-56 max-w-full" />
              </div>
            ))}
          </div>
          <div className="mt-2 flex h-[2.875rem] items-center justify-center rounded-lg border">
            <SkeletonText className="h-5 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}
