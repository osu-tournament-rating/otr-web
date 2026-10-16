import { Trophy } from 'lucide-react';

import {
  ListToolbarSkeleton,
  PhoneRowListSkeleton,
  TableSkeleton,
} from '@/components/kit/feedback/Skeletons';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';
import { Panel } from '@/components/kit/layout/Panel';

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
        {/* The scope block stands in for All / Friends, which only
            signed-in visitors see. The rulesets are a RulesetSwitch, so
            there is no All chip. */}
        <ListToolbarSkeleton
          search
          sort
          filters
          scope="w-36"
          rulesets={5}
          rulesetsAll={false}
          count
        />
        <TableSkeleton
          columns={COLUMNS}
          rows={20}
          phoneRows={<PhoneRowListSkeleton rows={12} rank leading={32} />}
        />
      </Panel>
    </PageFrame>
  );
}
