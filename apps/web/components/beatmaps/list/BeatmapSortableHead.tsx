'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { Eyebrow } from '@/components/beatmap/BeatmapSection';
import { Button } from '@/components/ui/button';
import { TableHead } from '@/components/ui/table';
import type {
  BeatmapListSortChange,
  BeatmapListSortKey,
} from '@/lib/beatmaps/list-params';
import { cn } from '@/lib/utils';

interface BeatmapSortableHeadProps {
  sort: BeatmapListSortKey;
  label: string;
  activeSort: BeatmapListSortKey;
  descending: boolean;
  onSortChange: BeatmapListSortChange;
  className?: string;
}

/** A column header that writes the list's sort into the URL when clicked. */
export default function BeatmapSortableHead({
  sort,
  label,
  activeSort,
  descending,
  onSortChange,
  className,
}: BeatmapSortableHeadProps) {
  const active = activeSort === sort;
  const Icon = active ? (descending ? ArrowDown : ArrowUp) : ArrowUpDown;

  return (
    <TableHead
      className={cn('h-8', className)}
      aria-sort={active ? (descending ? 'descending' : 'ascending') : 'none'}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        // A fresh column starts descending, matching the request schema default.
        onClick={() => onSortChange(sort, active ? !descending : true)}
        className="h-7 gap-1 px-1 has-[>svg]:px-1"
      >
        <Eyebrow className={cn(active && 'text-foreground')}>{label}</Eyebrow>
        <Icon
          className={cn(
            'size-3',
            active ? 'text-foreground' : 'text-muted-foreground/60'
          )}
          aria-hidden="true"
        />
      </Button>
    </TableHead>
  );
}
