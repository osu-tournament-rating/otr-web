'use client';

import type { Ruleset } from '@otr/core/osu';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { Panel, PanelBody } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { RulesetSwitch } from '@/components/kit/lists/RulesetSwitch';
import { formatCount } from '@/lib/kit/format/number';
import { RATED_RULESETS } from '@/lib/kit/format/ruleset';
import { listStateHref, parseListState } from '@/lib/kit/lists/params';
import { useSession } from '@/lib/hooks/useSession';
import { orpc } from '@/lib/orpc/orpc';
import type { PlatformStats } from '@/lib/orpc/schema/stats';

import { RATING_BUCKET_SIZE, STATS_PANELS } from './chart-panels';
import RatingDistributionChart from './RatingDistributionChart';
import { STATS_PARAMS } from './stats-params';
import { getRatingDistribution } from './stats-data';

/**
 * The ruleset in the address (`?ruleset=1`). Every ruleset's distribution
 * is already on the page, so switching writes the address in place instead
 * of asking the server to render the page again.
 */
function useStatsRuleset() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { ruleset } = parseListState(STATS_PARAMS, searchParams);

  const setRuleset = useCallback(
    (next: Ruleset) => {
      window.history.pushState(
        null,
        '',
        listStateHref(pathname, STATS_PARAMS, { ruleset: next }, searchParams)
      );
    },
    [pathname, searchParams]
  );

  return [ruleset, setRuleset] as const;
}

/** The signed-in player's rating in each rated ruleset they have one in. */
function useOwnRatings(): Partial<Record<Ruleset, number>> {
  const session = useSession();
  const playerId = session?.player.id;
  const [ratings, setRatings] = useState<Partial<Record<Ruleset, number>>>({});

  useEffect(() => {
    if (playerId === undefined) {
      setRatings({});
      return;
    }

    let cancelled = false;
    // One failed ruleset should not drop the markers for the others.
    Promise.allSettled(
      RATED_RULESETS.map((ruleset) =>
        orpc.players.stats({ id: playerId, keyType: 'otr', ruleset })
      )
    ).then((results) => {
      if (cancelled) return;
      const next: Partial<Record<Ruleset, number>> = {};
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.rating) {
          next[result.value.ruleset] = result.value.rating.rating;
        }
      }
      setRatings(next);
    });

    return () => {
      cancelled = true;
    };
  }, [playerId]);

  return ratings;
}

export default function RatingDistributionPanel({
  ratingsByRuleset,
}: {
  ratingsByRuleset: PlatformStats['ratingStats']['ratingsByRuleset'];
}) {
  const [ruleset, setRuleset] = useStatsRuleset();
  const ownRatings = useOwnRatings();
  const ratings = ratingsByRuleset[`${ruleset}`];
  const distribution = useMemo(
    () => getRatingDistribution(ratings ?? {}, RATING_BUCKET_SIZE),
    [ratings]
  );

  return (
    <Panel data-testid="rating-distribution">
      <SectionHeader
        {...STATS_PANELS.ratingDistribution}
        meta={
          distribution.totalPlayers > 0
            ? `${formatCount(distribution.totalPlayers)} players`
            : undefined
        }
      />
      <div className="border-b px-4 py-3">
        <RulesetSwitch value={ruleset} onValueChange={setRuleset} />
      </div>
      {distribution.buckets.length === 0 ? (
        <EmptyState
          size="compact"
          icon={STATS_PANELS.ratingDistribution.icon}
          title="No data available for this ruleset"
          data-testid={`chart-rating-distribution-${ruleset}`}
        />
      ) : (
        <PanelBody>
          <RatingDistributionChart
            ruleset={ruleset}
            distribution={distribution}
            bucketSize={RATING_BUCKET_SIZE}
            userRating={ownRatings[ruleset]}
          />
        </PanelBody>
      )}
    </Panel>
  );
}
