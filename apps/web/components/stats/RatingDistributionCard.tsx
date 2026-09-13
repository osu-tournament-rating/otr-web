'use client';

import { BarChart3 } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
import RatingDistributionChart from '@/components/stats/RatingDistributionChart';
import { useSession } from '@/lib/hooks/useSession';
import { orpc } from '@/lib/orpc/orpc';
import type { Ruleset } from '@otr/core/osu';
import { formatRating } from '@/lib/utils/chart';

const CHART_HEIGHT = 220;

/** Rated players per bucket in the selected ruleset, with the viewer's marker. */
export default function RatingDistributionCard({
  ruleset,
  ratings,
}: {
  ruleset: Ruleset;
  ratings: Record<string, number>;
}) {
  const session = useSession();
  const playerId = session?.player.id;
  const [userRating, setUserRating] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!playerId) {
      setUserRating(undefined);
      return;
    }

    let active = true;

    orpc.players
      .stats({ id: playerId, keyType: 'otr', ruleset })
      .then((result) => {
        if (active) {
          setUserRating(result.rating?.rating);
        }
      })
      .catch(() => {
        if (active) {
          setUserRating(undefined);
        }
      });

    return () => {
      active = false;
    };
  }, [playerId, ruleset]);

  return (
    <SectionCard
      className="flex flex-col"
      data-testid="stats-card-rating-distribution"
    >
      <SectionHeader
        icon={BarChart3}
        title="Rating distribution"
        infoText="Current rated players per 25 TR bucket, with the cumulative share on the right axis."
        meta={
          userRating === undefined
            ? undefined
            : `Your rating: ${formatRating(userRating)} TR`
        }
      />
      <div className="px-2 py-4 sm:px-4">
        <RatingDistributionChart
          ruleset={ruleset}
          ratings={ratings}
          userRating={userRating}
          height={CHART_HEIGHT}
        />
      </div>
    </SectionCard>
  );
}
