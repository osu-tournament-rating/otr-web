'use client';

import { Music } from 'lucide-react';

import BeatmapListCards from '@/components/beatmaps/list/BeatmapListCards';
import BeatmapListRows from '@/components/beatmaps/list/BeatmapListRows';
import BeatmapListTable from '@/components/beatmaps/list/BeatmapListTable';
import type { BeatmapLayout } from '@/components/beatmaps/list/layout';
import { EmptyState } from '@/components/kit/feedback/EmptyState';
import type {
  BeatmapListSortChange,
  BeatmapListSortKey,
} from '@/lib/beatmaps/list-params';
import { toBeatmapTableRows } from '@/lib/beatmaps/table-row';
import type { BeatmapListItem } from '@/lib/orpc/schema/beatmapList';

interface BeatmapListGridProps {
  beatmaps: BeatmapListItem[];
  /** A search, ruleset or filter narrowed the list. */
  isFiltered?: boolean;
  /** The list without its filters; set only when filters are active. */
  clearFiltersHref?: string;
  layout: BeatmapLayout;
  sort: BeatmapListSortKey;
  descending: boolean;
  onSortChange: BeatmapListSortChange;
}

/** Picks the renderer for the selected layout and owns the shared empty state. */
export default function BeatmapListGrid({
  beatmaps,
  isFiltered = false,
  clearFiltersHref,
  layout,
  sort,
  descending,
  onSortChange,
}: BeatmapListGridProps) {
  if (beatmaps.length === 0) {
    return (
      <EmptyState
        data-testid="beatmap-empty-state"
        icon={isFiltered ? undefined : Music}
        title={isFiltered ? 'No beatmaps match' : 'No beatmaps yet'}
        description={
          isFiltered
            ? 'Try a different search, ruleset or fewer filters.'
            : 'No tournament maps are listed.'
        }
        clearFilters={clearFiltersHref ? { href: clearFiltersHref } : undefined}
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
            stickyHeader
            phoneRows={<BeatmapListRows beatmaps={beatmaps} />}
          />
        </div>
      );
  }
}
