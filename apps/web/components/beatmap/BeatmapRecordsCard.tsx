'use client';

import { Library, ListOrdered, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import BeatmapPoolRow, {
  POOL_COLUMN_CLASSES,
} from '@/components/beatmap/BeatmapPoolRow';
import BeatmapScoresTable from '@/components/beatmap/BeatmapScoresTable';
import {
  EmptyState,
  Eyebrow,
  SectionCard,
} from '@/components/beatmap/BeatmapSection';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { sortPoolsByDate, sortPoolsByGames } from '@/lib/beatmaps/records';
import type {
  BeatmapTopPerformer,
  BeatmapTournamentUsage,
} from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';

type PoolSort = 'played' | 'recent';
type RecordTab = 'pools' | 'scores';

const INITIAL_POOL_COUNT = 12;
const POOL_PAGE_SIZE = 20;

/** The two record sets a beatmap accumulates: where it was pooled, and how it was played. */
export default function BeatmapRecordsCard({
  pools,
  performers,
  beatmapOsuId,
  totalScoreCount,
}: {
  pools: BeatmapTournamentUsage[];
  performers: BeatmapTopPerformer[];
  beatmapOsuId: number;
  totalScoreCount: number;
}) {
  const [tab, setTab] = useState<RecordTab>('pools');
  const [sort, setSort] = useState<PoolSort>('played');
  const [displayCount, setDisplayCount] = useState(INITIAL_POOL_COUNT);

  const ordered = useMemo(
    () =>
      sort === 'played' ? sortPoolsByGames(pools) : sortPoolsByDate(pools),
    [pools, sort]
  );
  const maxGames = useMemo(
    () => pools.reduce((max, pool) => Math.max(max, pool.gameCount), 0),
    [pools]
  );

  // The count belongs to whichever record set is on screen, so it moves with
  // the tab instead of sitting on the triggers.
  const tabCount =
    tab === 'pools'
      ? `${pools.length.toLocaleString()} ${pools.length === 1 ? 'pool' : 'pools'}`
      : `${totalScoreCount.toLocaleString()} ${totalScoreCount === 1 ? 'score' : 'scores'}`;

  return (
    <SectionCard>
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as RecordTab)}
        className="gap-0"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <TabsList>
            <TabsTrigger value="pools">
              <Library aria-hidden />
              Pools
            </TabsTrigger>
            <TabsTrigger value="scores">
              <ListOrdered aria-hidden />
              Scores
            </TabsTrigger>
          </TabsList>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {tabCount}
          </span>
        </div>

        <TabsContent
          value="pools"
          data-testid="beatmap-tournaments-list"
          className="mt-0"
        >
          {pools.length === 0 ? (
            <EmptyState>No pool records.</EmptyState>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-4 py-2">
                <ToggleGroup
                  type="single"
                  size="sm"
                  value={sort}
                  onValueChange={(value) => value && setSort(value as PoolSort)}
                  aria-label="Sort pool records"
                >
                  <ToggleGroupItem value="played" className="text-xs">
                    Most played
                  </ToggleGroupItem>
                  <ToggleGroupItem value="recent" className="text-xs">
                    Most recent
                  </ToggleGroupItem>
                </ToggleGroup>
                <div aria-hidden className="flex items-center gap-3">
                  <Eyebrow className={POOL_COLUMN_CLASSES.mod}>Mod</Eyebrow>
                  <Eyebrow
                    className={cn('text-right', POOL_COLUMN_CLASSES.games)}
                  >
                    Games
                  </Eyebrow>
                  <span className={POOL_COLUMN_CLASSES.toggle} />
                </div>
              </div>

              <div className="divide-y">
                {ordered.slice(0, displayCount).map((pool) => (
                  <BeatmapPoolRow
                    key={pool.tournament.id}
                    pool={pool}
                    beatmapOsuId={beatmapOsuId}
                    maxGames={maxGames}
                  />
                ))}
              </div>

              {pools.length > displayCount && (
                <div className="border-t p-3">
                  <Button
                    data-testid="beatmap-tournaments-show-more"
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      setDisplayCount(
                        Math.min(displayCount + POOL_PAGE_SIZE, pools.length)
                      )
                    }
                  >
                    <Plus aria-hidden />
                    Show {Math.min(
                      POOL_PAGE_SIZE,
                      pools.length - displayCount
                    )}{' '}
                    more
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent
          value="scores"
          data-testid="beatmap-top-performers"
          className="mt-0"
        >
          <BeatmapScoresTable performers={performers} />
        </TabsContent>
      </Tabs>
    </SectionCard>
  );
}
