import { Medal } from 'lucide-react';

import {
  ListToolbarSkeleton,
  PhoneRowListSkeleton,
  TableSkeleton,
} from '@/components/kit/feedback/Skeletons';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';
import { Panel } from '@/components/kit/layout/Panel';
import { LEADERBOARD_COLUMN_WIDTHS } from '@/components/leaderboard/LeaderboardTable';

/** The loaded table's columns at its widths, so the header doesn't shift. */
const COLUMNS = [
  { label: 'Rank', width: LEADERBOARD_COLUMN_WIDTHS.rank },
  { label: 'Player' },
  { label: 'Tier', width: LEADERBOARD_COLUMN_WIDTHS.tier },
  { label: 'Rating', width: LEADERBOARD_COLUMN_WIDTHS.rating, align: 'end' },
  {
    label: 'Tournaments',
    width: LEADERBOARD_COLUMN_WIDTHS.tournaments,
    align: 'end',
  },
  { label: 'Matches', width: LEADERBOARD_COLUMN_WIDTHS.matches, align: 'end' },
  { label: 'Win rate', width: LEADERBOARD_COLUMN_WIDTHS.winRate, align: 'end' },
] as const;

export default function LeaderboardLoading() {
  return (
    <PageFrame>
      <PageHeader
        icon={Medal}
        title="Leaderboard"
        description="Players ranked by tournament rating."
      />
      <Panel as="div" role="status" aria-label="Loading leaderboard">
        {/* The scope block stands in for All / Friends (narrower below sm,
            as the switch is), which only signed-in visitors see. The
            rulesets are a RulesetSwitch, so there is no All chip. */}
        <ListToolbarSkeleton
          search
          sort
          filters
          scope="w-29 sm:w-31"
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
