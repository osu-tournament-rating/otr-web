'use client';

import { Trophy } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/kit/controls/Button';
import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { Panel } from '@/components/kit/layout/Panel';
import { RowList } from '@/components/kit/layout/RowList';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { formatCount, formatCountOf } from '@/lib/kit/format/number';
import { formatLoadedReadout } from '@/lib/kit/tables/pagination';
import type { PlayerRatingAdjustment } from '@/lib/orpc/schema/playerStats';
import type { PlayerTournamentListItem } from '@/lib/orpc/schema/tournament';

import PlayerTournamentCard from './PlayerTournamentCard';

const INITIAL_COUNT = 5;
const LOAD_MORE_COUNT = 25;

/**
 * A player's tournaments as divided rows, five at first, with "Show more"
 * revealing the rest 25 at a time. Each row expands its own matches.
 */
export default function PlayerTournamentsList({
  tournaments,
  adjustments,
}: {
  tournaments: PlayerTournamentListItem[];
  adjustments: PlayerRatingAdjustment[];
}) {
  const [displayCount, setDisplayCount] = useState(INITIAL_COUNT);
  const remaining = Math.max(tournaments.length - displayCount, 0);

  return (
    <Panel>
      <SectionHeader
        data-testid="tournament-history-title"
        icon={Trophy}
        title="Tournament history"
        meta={
          tournaments.length > 0
            ? formatCountOf(tournaments.length, 'tournament')
            : undefined
        }
      />
      {tournaments.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No tournament data available"
          titleAs="h3"
        />
      ) : (
        <>
          <RowList>
            {tournaments.slice(0, displayCount).map((tournament) => (
              <PlayerTournamentCard
                key={tournament.id}
                tournament={tournament}
                adjustments={adjustments}
              />
            ))}
          </RowList>
          {remaining > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t bg-muted/20 px-4 py-3 dark:bg-muted">
              <p
                className="text-xs text-muted-foreground tabular-nums"
                aria-live="polite"
              >
                Showing {formatLoadedReadout(displayCount, tournaments.length)}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setDisplayCount((count) =>
                    Math.min(count + LOAD_MORE_COUNT, tournaments.length)
                  )
                }
              >
                Show more ({formatCount(remaining)} more)
              </Button>
            </div>
          ) : null}
        </>
      )}
    </Panel>
  );
}
