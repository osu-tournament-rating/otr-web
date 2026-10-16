import { Music } from 'lucide-react';

import { BEATMAP_CARD_GRID_CLASS } from '@/components/beatmaps/list/layout';
import {
  PanelSkeleton,
  SkeletonText,
} from '@/components/kit/feedback/Skeletons';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';
import { cn } from '@/lib/utils';

/** A bar that fills its box, for controls and artwork. */
function Block({ className }: { className?: string }) {
  return <SkeletonText className={cn('block h-auto w-auto', className)} />;
}

export default function BeatmapsLoading() {
  return (
    <PageFrame>
      <PageHeader
        icon={Music}
        title="Beatmaps"
        description="Tournament maps and observed play data."
      />
      <PanelSkeleton label="Loading beatmaps">
        {/* The ListToolbar's two rows */}
        <div className="flex flex-col gap-3 border-b bg-muted/20 p-3 sm:p-4 dark:bg-muted">
          <div className="flex flex-col gap-2 md:flex-row md:gap-4">
            <Block className="h-10 flex-1" />
            <div className="flex gap-2 md:border-l md:pl-4">
              <Block className="h-10 flex-1 md:w-48 md:flex-none" />
              <Block className="size-10" />
              <Block className="ml-2 h-10 w-24 md:ml-4" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Block className="h-8 w-80 max-w-full" />
            <Block className="ml-auto h-8 w-40" />
          </div>
        </div>
        <div
          className={cn(
            BEATMAP_CARD_GRID_CLASS,
            'bg-muted/10 dark:bg-background/20'
          )}
        >
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-xl border bg-card dark:bg-secondary/35"
            >
              <Block className="aspect-[16/7] w-full rounded-none" />
              <div className="min-w-0 p-3.5 sm:p-4">
                <div className="space-y-1.5">
                  <Block className="h-5 w-3/4" />
                  <Block className="h-4 w-2/5" />
                  <Block className="h-3.5 w-3/5" />
                </div>
                <div className="flex flex-col gap-1.5 pt-3 sm:h-9 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex h-6 items-center sm:h-auto">
                    <Block className="h-4 w-24 sm:w-28" />
                  </div>
                  <div className="flex h-6 items-center sm:h-auto">
                    <Block className="h-4 w-40 sm:w-36" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PanelSkeleton>
    </PageFrame>
  );
}
