import { Trophy } from 'lucide-react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';
import { Panel } from '@/components/kit/layout/Panel';
import { PaginationFooter } from '@/components/kit/tables/PaginationFooter';
import LeaderboardFirstVisitDialog from '@/components/leaderboard/LeaderboardFirstVisitDialog';
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable';
import LeaderboardToolbar from '@/components/leaderboard/LeaderboardToolbar';
import { auth } from '@/lib/auth/auth';
import { hasFriends } from '@/lib/db/player-friends';
import { formatCountOf } from '@/lib/kit/format/number';
import {
  clearListFilters,
  countActiveFilters,
  parseListState,
} from '@/lib/kit/lists/params';
import { orpc } from '@/lib/orpc/orpc';

import {
  LEADERBOARD_LIST_PARAMS,
  leaderboardHref,
  toLeaderboardRequest,
} from './list-params';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description:
    'View the global tournament rating leaderboard and player rankings.',
};

export default async function Page(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const state = parseListState(
    LEADERBOARD_LIST_PARAMS,
    await props.searchParams
  );

  const session = await auth.api.getSession({ headers: await headers() });
  const playerId = session?.dbPlayer?.id ?? null;
  const userHasFriends = playerId ? await hasFriends(playerId) : false;

  // Friends needs a session and someone to compare with.
  if (state.friend && !userHasFriends) {
    redirect(leaderboardHref(state, { friend: false }));
  }

  const request = toLeaderboardRequest(state);
  const data = state.friend
    ? await orpc.leaderboard.friends(request)
    : await orpc.leaderboard.list(request);

  // The server clamps a page past the end; show the address it answered.
  if (data.page !== state.page) {
    redirect(leaderboardHref(state, { page: data.page }));
  }

  const filtered = countActiveFilters(LEADERBOARD_LIST_PARAMS, state) > 0;

  return (
    <PageFrame>
      <LeaderboardFirstVisitDialog />
      <PageHeader
        icon={Trophy}
        title={<span data-testid="leaderboard-title">Leaderboard</span>}
        description="Players ranked by tournament rating."
      />
      <Panel data-testid="leaderboard-card">
        <LeaderboardToolbar
          count={formatCountOf(data.total, 'player')}
          signedIn={Boolean(session)}
          hasFriends={userHasFriends}
        />
        {data.leaderboard.length > 0 ? (
          <LeaderboardTable
            rows={data.leaderboard}
            state={state}
            currentPlayerId={playerId}
          />
        ) : (
          <EmptyState
            title="No players match"
            description="Try a different name, ruleset, or fewer filters."
            clearFilters={
              filtered
                ? {
                    href: leaderboardHref(
                      state,
                      clearListFilters(LEADERBOARD_LIST_PARAMS, state)
                    ),
                  }
                : undefined
            }
          />
        )}
        <PaginationFooter
          data-testid="leaderboard-pagination"
          page={data.page}
          pageSize={data.pageSize}
          totalCount={data.total}
          getPageHref={(page) => leaderboardHref(state, { page })}
          label="Leaderboard pages"
        />
      </Panel>
    </PageFrame>
  );
}
