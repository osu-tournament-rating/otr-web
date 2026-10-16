import { ChartNoAxesColumnIncreasing } from 'lucide-react';

import TierIcon from '@/components/icons/TierIcon';
import { Panel, PanelBody } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { StatTile, StatTileGrid } from '@/components/kit/layout/StatTile';
import TRText from '@/components/rating/TRText';
import {
  formatCount,
  formatPercentile,
  formatRank,
  formatRating,
} from '@/lib/kit/format/number';
import type { PlayerRatingStats as PlayerRatingStatsData } from '@/lib/orpc/schema/playerStats';
import type { TierName } from '@/lib/utils/tierData';

import PlayerTierProgress from './PlayerTierProgress';

/**
 * The profile's numbers for one ruleset: rating (with the tier icon just
 * left of it), percentile, ranks and counts, then the slim strip toward the
 * next tier. There is no tier tile; the icon's tooltip names the tier.
 */
export default function PlayerRatingStats({
  rating,
}: {
  rating: PlayerRatingStatsData;
}) {
  const { tierProgress } = rating;

  return (
    <Panel data-testid="player-rating-stats">
      <SectionHeader icon={ChartNoAxesColumnIncreasing} title="Rating" />
      <PanelBody className="flex flex-col gap-4">
        <StatTileGrid columns={3} className="lg:grid-cols-6">
          <StatTile
            data-testid="stat-card-rating"
            label="Rating"
            adornment={
              <TierIcon
                data-testid="stat-card-tier"
                tier={tierProgress.currentTier as TierName}
                subTier={tierProgress.currentSubTier ?? undefined}
                tooltip
                width={22}
                height={22}
              />
            }
            value={
              <span className="flex items-baseline gap-1">
                {formatRating(rating.rating)}
                <TRText />
              </span>
            }
          />
          <StatTile
            data-testid="stat-card-percentile"
            label="Percentile"
            value={formatPercentile(rating.percentile, { short: true })}
          />
          <StatTile
            data-testid="stat-card-global"
            label="Global rank"
            value={formatRank(rating.globalRank)}
          />
          <StatTile
            data-testid="stat-card-country"
            label="Country rank"
            value={formatRank(rating.countryRank)}
          />
          <StatTile
            data-testid="stat-card-tournaments"
            label="Tournaments"
            value={formatCount(rating.tournamentsPlayed)}
          />
          <StatTile
            data-testid="stat-card-matches"
            label="Matches"
            value={formatCount(rating.matchesPlayed)}
          />
        </StatTileGrid>

        <PlayerTierProgress rating={rating} />
      </PanelBody>
    </Panel>
  );
}
