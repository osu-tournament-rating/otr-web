import { Trophy } from 'lucide-react';

import {
  PanelSkeleton,
  SkeletonText,
} from '@/components/kit/feedback/Skeletons';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';
import { ListToolbar } from '@/components/kit/lists/ListToolbar';
import { TournamentListSkeleton } from '@/components/tournaments/list/TournamentList';
import { RATED_RULESETS } from '@/lib/kit/format/ruleset';

/** The toolbar's controls as bars of the same size, so nothing moves. */
function ToolbarSkeleton() {
  return (
    <ListToolbar
      label="Search and filter tournaments"
      aria-hidden="true"
      search={<SkeletonText className="block h-10 w-full" />}
      sort={
        <div className="flex gap-2">
          <SkeletonText className="block h-10 flex-1 md:w-48 md:flex-none" />
          <SkeletonText className="block size-10" />
        </div>
      }
      filters={<SkeletonText className="block h-10 w-24" />}
      rulesets={
        <div className="flex flex-wrap gap-1.5">
          {[null, ...RATED_RULESETS].map((ruleset) => (
            <SkeletonText
              key={ruleset ?? 'all'}
              className="block h-8 w-20 rounded-full"
            />
          ))}
        </div>
      }
      count={<SkeletonText className="h-3 w-24" />}
    />
  );
}

export default function TournamentsLoading() {
  return (
    <PageFrame>
      <PageHeader
        icon={Trophy}
        title="Tournaments"
        description="Browse tournament submissions and their review status. Only verified data is included in ratings."
      />
      <PanelSkeleton label="Loading tournaments">
        <ToolbarSkeleton />
        <TournamentListSkeleton />
      </PanelSkeleton>
    </PageFrame>
  );
}
