'use client';

import Link from 'next/link';

import BeatmapEmptyState from '@/components/beatmaps/BeatmapEmptyState';
import BeatmapListCards from '@/components/beatmaps/list/BeatmapListCards';
import BeatmapListRows from '@/components/beatmaps/list/BeatmapListRows';
import BeatmapListTable from '@/components/beatmaps/list/BeatmapListTable';
import type { BeatmapLayout } from '@/components/beatmaps/list/layout';
import { Button } from '@/components/ui/button';
import type {
  BeatmapListSortChange,
  BeatmapListSortKey,
} from '@/lib/beatmaps/list-params';
import { toBeatmapTableRows } from '@/lib/beatmaps/table-row';
import type { BeatmapListItem } from '@/lib/orpc/schema/beatmapList';

interface BeatmapListGridProps {
  beatmaps: BeatmapListItem[];
  isFiltered?: boolean;
  layout: BeatmapLayout;
  sort: BeatmapListSortKey;
  descending: boolean;
  onSortChange: BeatmapListSortChange;
}

/** Picks the renderer for the selected layout and owns the shared empty state. */
export default function BeatmapListGrid({
  beatmaps,
  isFiltered = false,
  layout,
  sort,
  descending,
  onSortChange,
}: BeatmapListGridProps) {
  if (beatmaps.length === 0) {
    return (
      <BeatmapEmptyState
        testId="beatmap-empty-state"
        title={isFiltered ? 'No beatmaps match' : 'No beatmaps yet'}
        body={
          isFiltered ? 'Try fewer filters.' : 'No tournament maps are listed.'
        }
        action={
          isFiltered ? (
            <Button asChild variant="outline">
              <Link href="/beatmaps">Clear filters</Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  switch (layout) {
    case 'cards':
      return (
        <BeatmapListCards
          beatmaps={beatmaps}
          data-testid="beatmap-list"
          data-layout={layout}
        />
      );

    case 'compact':
      return (
        <BeatmapListRows
          beatmaps={beatmaps}
          data-testid="beatmap-list"
          data-layout={layout}
        />
      );

    case 'table':
      return (
        <div data-testid="beatmap-list" data-layout={layout}>
          <BeatmapListTable
            beatmaps={toBeatmapTableRows(beatmaps)}
            sort={sort}
            descending={descending}
            onSortChange={onSortChange}
            className="hidden sm:block"
          />
          {/* Ten columns cannot honestly fit a phone, and the compact rows
              already exist, so the table falls back to them below `sm`. */}
          <BeatmapListRows beatmaps={beatmaps} className="sm:hidden" />
        </div>
      );
  }
}
