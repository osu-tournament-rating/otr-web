'use client';

import type { Ruleset } from '@otr/core/osu';
import { Music } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import SectionError from '@/components/error/SectionError';
import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { Panel } from '@/components/kit/layout/Panel';
import { RowList } from '@/components/kit/layout/RowList';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { LoadMore } from '@/components/kit/tables/LoadMore';
import { formatCountOf } from '@/lib/kit/format/number';
import { orpc } from '@/lib/orpc/orpc';
import type { PlayerBeatmapStats } from '@/lib/orpc/schema/playerBeatmaps';

import PlayerBeatmapCard from './PlayerBeatmapCard';

const LOAD_MORE_COUNT = 25;

/**
 * The beatmaps a player mapped that were pooled in tracked tournaments. The
 * first few come from the server; "Show more" fetches the rest 25 at a time.
 */
export default function PlayerBeatmapsList({
  playerId,
  ruleset,
  initialBeatmaps,
  totalCount: initialTotal,
}: {
  playerId?: number;
  ruleset?: Ruleset;
  initialBeatmaps: PlayerBeatmapStats[];
  totalCount: number;
}) {
  const [beatmaps, setBeatmaps] =
    useState<PlayerBeatmapStats[]>(initialBeatmaps);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  // Bumped on reset so a page still loading for the old list is dropped
  const listVersion = useRef(0);

  useEffect(() => {
    // Drop cached pages when the player or ruleset changes
    listVersion.current += 1;
    setBeatmaps(initialBeatmaps);
    setTotalCount(initialTotal);
    setHasError(false);
    setIsLoading(false);
  }, [initialBeatmaps, initialTotal, playerId, ruleset]);

  // Both conditions: the list is briefly empty across an SSR cache reset
  const isEmpty = totalCount === 0 && beatmaps.length === 0;
  const remainingCount = Math.max(totalCount - beatmaps.length, 0);

  const handleLoadMore = async () => {
    if (isLoading || remainingCount === 0 || !playerId) {
      return;
    }

    const version = listVersion.current;
    setIsLoading(true);
    setHasError(false);

    try {
      const response = await orpc.players.beatmaps({
        id: playerId,
        keyType: 'otr',
        ruleset,
        offset: beatmaps.length,
        limit: LOAD_MORE_COUNT,
      });

      if (version !== listVersion.current) {
        return;
      }

      const existingIds = new Set(beatmaps.map((beatmap) => beatmap.id));
      const newBeatmaps = response.beatmaps.filter(
        (beatmap) => !existingIds.has(beatmap.id)
      );

      setBeatmaps((prev) => [...prev, ...newBeatmaps]);
      setTotalCount(response.totalCount);
    } catch (error) {
      if (version !== listVersion.current) {
        return;
      }

      console.error('Failed to load additional beatmaps', error);
      setHasError(true);
    } finally {
      if (version === listVersion.current) {
        setIsLoading(false);
      }
    }
  };

  return (
    <Panel>
      <SectionHeader
        icon={Music}
        title="Pooled beatmaps"
        meta={isEmpty ? undefined : formatCountOf(totalCount, 'beatmap')}
      />
      {isEmpty ? (
        <EmptyState
          data-testid="player-beatmaps-empty"
          icon={Music}
          title="No pooled beatmaps"
          titleAs="h3"
          description="No beatmaps by this player have been pooled in a tracked tournament."
        />
      ) : (
        <RowList>
          {beatmaps.map((beatmap) => (
            <PlayerBeatmapCard key={beatmap.id} beatmap={beatmap} />
          ))}
        </RowList>
      )}
      {hasError ? (
        <div className="border-t px-4 py-4">
          <SectionError
            size="inline"
            title="More beatmaps could not load"
            retrying={isLoading}
            onRetry={() => void handleLoadMore()}
          />
        </div>
      ) : isEmpty || !playerId ? null : (
        <LoadMore
          label="Show more"
          hasMore={remainingCount > 0}
          loading={isLoading}
          shownCount={beatmaps.length}
          totalCount={totalCount}
          // The server's first batch; a list that fits in it needs no footer.
          pageSize={initialBeatmaps.length}
          onLoadMore={() => void handleLoadMore()}
        />
      )}
    </Panel>
  );
}
