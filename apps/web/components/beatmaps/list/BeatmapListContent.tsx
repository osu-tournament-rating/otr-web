'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { z } from 'zod';

import BeatmapListFilter from '@/components/beatmaps/list/BeatmapListFilter';
import BeatmapListGrid from '@/components/beatmaps/list/BeatmapListGrid';
import {
  isBeatmapLayout,
  type BeatmapLayout,
} from '@/components/beatmaps/list/layout';
import {
  buildBeatmapListPath,
  type BeatmapListSortChange,
} from '@/lib/beatmaps/list-params';
import type { BeatmapListItem } from '@/lib/orpc/schema/beatmapList';
import { beatmapListFilterSchema } from '@/lib/validation-schema';

type FilterData = z.infer<typeof beatmapListFilterSchema>;

const BEATMAP_LAYOUT_STORAGE_KEY = 'otr-beatmap-layout';

interface BeatmapListContentProps {
  beatmaps: BeatmapListItem[];
  filter: FilterData;
  isFiltered: boolean;
  totalCount: number;
}

export default function BeatmapListContent({
  beatmaps,
  filter,
  isFiltered,
  totalCount,
}: BeatmapListContentProps) {
  const router = useRouter();
  const [layout, setLayout] = useState<BeatmapLayout>('cards');

  useEffect(() => {
    try {
      const storedLayout = window.localStorage.getItem(
        BEATMAP_LAYOUT_STORAGE_KEY
      );
      if (isBeatmapLayout(storedLayout)) {
        setLayout(storedLayout);
      }
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
  }, []);

  // A device preference, not a shareable filter, so it stays out of the URL.
  const changeLayout = (nextLayout: BeatmapLayout) => {
    setLayout(nextLayout);
    try {
      window.localStorage.setItem(BEATMAP_LAYOUT_STORAGE_KEY, nextLayout);
    } catch {
      // The layout still changes for this session when storage is unavailable.
    }
  };

  // Shared by the sort select and the table headers so the two cannot diverge.
  const changeSort = useCallback<BeatmapListSortChange>(
    (sort, descending) => {
      router.push(
        buildBeatmapListPath({ ...filter, sort, descending, page: undefined }),
        { scroll: false }
      );
    },
    [filter, router]
  );

  return (
    <>
      <div className="border-b bg-muted/20 p-3 sm:p-4 dark:bg-muted">
        <BeatmapListFilter
          filter={filter}
          totalCount={totalCount}
          layout={layout}
          onLayoutChange={changeLayout}
          onSortChange={changeSort}
        />
      </div>

      <BeatmapListGrid
        beatmaps={beatmaps}
        isFiltered={isFiltered}
        layout={layout}
        sort={filter.sort}
        descending={filter.descending}
        onSortChange={changeSort}
      />
    </>
  );
}
