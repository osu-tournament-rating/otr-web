import { Music } from 'lucide-react';

import { BEATMAP_CARD_GRID_CLASS } from '@/components/beatmaps/list/layout';
import {
  ListToolbarSkeleton,
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
        <ListToolbarSkeleton search sort filters rulesets={6} view={3} count />
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
