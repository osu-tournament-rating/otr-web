import { Trophy } from 'lucide-react';

import {
  PhoneRowListSkeleton,
  SkeletonText,
  TableSkeleton,
} from '@/components/kit/feedback/Skeletons';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';
import { Panel } from '@/components/kit/layout/Panel';
import { ListToolbar } from '@/components/kit/lists/ListToolbar';

/** The loaded table's columns, so the header strip doesn't shift. */
const COLUMNS = [
  { label: 'Rank', width: 'w-20' },
  { label: 'Player' },
  { label: 'Tier', width: 'w-16 lg:w-44' },
  { label: 'Rating', width: 'w-24', align: 'end' },
  { label: 'Tournaments', width: 'w-28', align: 'end' },
  { label: 'Matches', width: 'w-24', align: 'end' },
  { label: 'Win rate', width: 'w-24', align: 'end' },
] as const;

export default function LeaderboardLoading() {
  return (
    <PageFrame>
      <PageHeader
        icon={Trophy}
        title="Leaderboard"
        description="Players ranked by tournament rating."
      />
      <Panel as="div" role="status" aria-label="Loading leaderboard">
        <ListToolbar
          label="Search and filter players"
          aria-hidden="true"
          search={<SkeletonText className="block h-10 w-full" />}
          sort={
            <span className="flex gap-2">
              <SkeletonText className="block h-10 flex-1 md:w-48 md:flex-none" />
              <SkeletonText className="block size-10" />
            </span>
          }
          filters={<SkeletonText className="block h-10 w-24" />}
          rulesets={
            <span className="flex flex-wrap gap-1.5">
              {Array.from({ length: 5 }, (_, index) => (
                <SkeletonText key={index} className="block h-8 w-20" />
              ))}
            </span>
          }
          count={<SkeletonText className="h-3 w-20" />}
        />
        <TableSkeleton
          columns={COLUMNS}
          rows={20}
          phoneRows={<PhoneRowListSkeleton rows={12} rank avatar />}
        />
      </Panel>
    </PageFrame>
  );
}
