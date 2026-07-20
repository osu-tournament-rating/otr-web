'use client';

import { useEffect, useState } from 'react';
import type { z } from 'zod';

import BeatmapListFilter from '@/components/beatmaps/list/BeatmapListFilter';
import BeatmapListTable, {
  type BeatmapLayout,
} from '@/components/beatmaps/list/BeatmapListTable';
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
  const [layout, setLayout] = useState<BeatmapLayout>('cards');

  useEffect(() => {
    try {
      const storedLayout = window.localStorage.getItem(
        BEATMAP_LAYOUT_STORAGE_KEY
      );
      if (storedLayout === 'cards' || storedLayout === 'compact') {
        setLayout(storedLayout);
      }
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
  }, []);

  const changeLayout = (nextLayout: BeatmapLayout) => {
    setLayout(nextLayout);
    try {
      window.localStorage.setItem(BEATMAP_LAYOUT_STORAGE_KEY, nextLayout);
    } catch {
      // The layout still changes for this session when storage is unavailable.
    }
  };

  return (
    <>
      <div className="border-b bg-muted/20 p-3 sm:p-4 dark:bg-muted">
        <BeatmapListFilter
          filter={filter}
          totalCount={totalCount}
          layout={layout}
          onLayoutChange={changeLayout}
        />
      </div>

      <BeatmapListTable
        beatmaps={beatmaps}
        isFiltered={isFiltered}
        layout={layout}
      />
    </>
  );
}
