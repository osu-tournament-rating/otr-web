import { Gamepad2, Swords, Trophy, Users } from 'lucide-react';

import {
  EmptyState,
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
import PlayerParticipationChart from '@/components/stats/PlayerParticipationChart';
import PlayerStatsActiveCard from '@/components/stats/PlayerStatsActiveCard';
import PlayerStatsDuosCard from '@/components/stats/PlayerStatsDuosCard';
import PlayerStatsFirstPlaceCard from '@/components/stats/PlayerStatsFirstPlaceCard';
import PlayerStatsLeaderCard from '@/components/stats/PlayerStatsLeaderCard';
import PlayerStatsMilestonesCard from '@/components/stats/PlayerStatsMilestonesCard';
import PlayerStatsModCard from '@/components/stats/PlayerStatsModCard';
import PlayerStatsNewcomersCard from '@/components/stats/PlayerStatsNewcomersCard';
import PlayerStatsUpsetsCard from '@/components/stats/PlayerStatsUpsetsCard';
import RatingDistributionCard from '@/components/stats/RatingDistributionCard';
import type { PlayerStatsRulesetValue } from '@/lib/orpc/schema/stats';
import { cn } from '@/lib/utils';
import {
  PLAYER_STATS_MODS,
  type PlayerStats,
} from '@otr/core/stats/player-stats';

/** Player statistics for the selected ruleset, or the pending state. */
export default function PlayersTab({
  ruleset,
  ratings,
  stats,
}: {
  ruleset: PlayerStatsRulesetValue;
  ratings: Record<string, number>;
  stats: PlayerStats | null;
}) {
  if (stats === null) {
    return (
      <div className="flex flex-col gap-6">
        <RatingDistributionCard ruleset={ruleset} ratings={ratings} />
        <SectionCard data-testid="stats-players-pending">
          <SectionHeader icon={Users} title="Player statistics" />
          <EmptyState>Player statistics are still being processed.</EmptyState>
        </SectionCard>
      </div>
    );
  }

  const mods = PLAYER_STATS_MODS[ruleset];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RatingDistributionCard ruleset={ruleset} ratings={ratings} />
        <PlayerParticipationChart participation={stats.participation} />
      </div>

      <div
        className={cn(
          'grid grid-cols-1 gap-6',
          mods.length === 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
        )}
      >
        <PlayerStatsLeaderCard
          icon={Trophy}
          title="Most tournaments"
          infoText="Verified tournaments played in this ruleset, all time."
          unit="tournaments"
          leaders={stats.leaders.tournaments}
          data-testid="stats-card-leaders-tournaments"
        />
        <PlayerStatsLeaderCard
          icon={Swords}
          title="Most matches"
          infoText="Verified matches played in this ruleset, all time."
          unit="matches"
          leaders={stats.leaders.matches}
          data-testid="stats-card-leaders-matches"
        />
        <PlayerStatsLeaderCard
          icon={Gamepad2}
          title="Most games"
          infoText="Verified games played in this ruleset, all time."
          unit="games"
          leaders={stats.leaders.games}
          data-testid="stats-card-leaders-games"
        />
        {mods.length > 0 ? (
          <PlayerStatsModCard mods={mods} entries={stats.mods} />
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PlayerStatsDuosCard duos={stats.duos} ruleset={ruleset} />
        <PlayerStatsUpsetsCard upsets={stats.upsets} ruleset={ruleset} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PlayerStatsFirstPlaceCard
          firstPlace={stats.firstPlace}
          ruleset={ruleset}
        />
        <PlayerStatsActiveCard active={stats.active} ruleset={ruleset} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PlayerStatsMilestonesCard
          milestones={stats.milestones}
          ruleset={ruleset}
        />
        <PlayerStatsNewcomersCard
          newcomers={stats.newcomers}
          ruleset={ruleset}
        />
      </div>
    </div>
  );
}
