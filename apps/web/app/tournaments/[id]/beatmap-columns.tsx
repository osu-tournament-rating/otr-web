'use client';

import type { Column, ColumnDef } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';

import BeatmapIdentity from '@/components/beatmaps/BeatmapIdentity';
import StarRatingPill from '@/components/beatmaps/StarRatingPill';
import SingleModIcon from '@/components/icons/SingleModIcon';
import SimpleTooltip from '@/components/simple-tooltip';
import { Button } from '@/components/ui/button';
import type { TournamentBeatmap } from '@/lib/orpc/schema/tournament';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/utils/date';
import type { Mods } from '@otr/core/osu';

/**
 * A pooled beatmap with the two values the table needs but the API does not
 * carry: the mod it was most often played under, and whether osu! still has it.
 * Both are resolved once per tournament rather than per cell.
 */
export type TournamentBeatmapRow = TournamentBeatmap & {
  topMod: { mod: Mods; gameCount: number } | null;
  isDeleted: boolean;
};

/** Attribute columns fold away before the table would need to scroll. */
const ATTRIBUTE_COLUMN_META = { cellClassName: 'hidden lg:table-cell' };

function ColumnHeader({
  column,
  label,
  description,
}: {
  column: Column<TournamentBeatmapRow, unknown>;
  label: string;
  /** Expands an abbreviated label, on hover and for screen readers alike. */
  description?: string;
}) {
  const sorted = column.getIsSorted();

  const button = (
    // has-[>svg]:px-0 undoes the size variant's icon padding, which `p-0` alone
    // leaves behind: ten columns of it is 240px the table does not have.
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className="h-auto p-0 font-semibold hover:bg-transparent has-[>svg]:px-0"
    >
      {label}
      {description ? <span className="sr-only"> ({description})</span> : null}
      {sorted === 'asc' ? (
        <ArrowUp className="h-4 w-4" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="h-4 w-4" />
      ) : (
        <ArrowUpDown className="h-4 w-4" />
      )}
    </Button>
  );

  return description ? (
    <SimpleTooltip content={description}>{button}</SimpleTooltip>
  ) : (
    button
  );
}

export const beatmapColumns: ColumnDef<TournamentBeatmapRow>[] = [
  {
    id: 'beatmap',
    accessorFn: (row) => row.beatmapset?.title ?? '',
    sortingFn: 'text',
    header: ({ column }) => <ColumnHeader column={column} label="Beatmap" />,
    cell: ({ row }) => {
      const beatmap = row.original;
      // Passed as a name rather than as a player object: BeatmapIdentity would
      // link the mapper, and an anchor cannot nest inside the row's own link.
      const creator = beatmap.creators[0] ?? beatmap.beatmapset?.creator;

      return (
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={`/beatmaps/${beatmap.osuId}`}
            prefetch={false}
            className={cn(
              // Capped so the attribute columns and the admin checkbox still
              // fit the card without the table scrolling sideways.
              'group max-w-52 min-w-0 rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sm:max-w-64 lg:max-w-72',
              beatmap.isDeleted && 'text-muted-foreground line-through'
            )}
          >
            <BeatmapIdentity
              osuId={beatmap.osuId}
              beatmapsetOsuId={beatmap.beatmapset?.osuId}
              artist={beatmap.beatmapset?.artist || 'Unknown artist'}
              title={beatmap.beatmapset?.title || 'Unknown title'}
              diffName={beatmap.diffName || 'Unknown difficulty'}
              creator={creator?.username ?? null}
              size="table"
              coverSizes="40px"
            />
          </Link>
          {beatmap.isDeleted ? (
            <span className="shrink-0 text-xs text-muted-foreground">
              (deleted from osu!)
            </span>
          ) : null}
        </div>
      );
    },
  },
  {
    id: 'sr',
    accessorFn: (row) => row.sr,
    header: ({ column }) => (
      <ColumnHeader column={column} label="SR" description="Star rating" />
    ),
    cell: ({ row }) => <StarRatingPill starRating={row.original.sr} />,
  },
  {
    id: 'length',
    accessorFn: (row) => row.totalLength,
    header: ({ column }) => <ColumnHeader column={column} label="Length" />,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatDuration(row.original.totalLength)}
      </span>
    ),
  },
  {
    id: 'bpm',
    accessorFn: (row) => row.bpm,
    header: ({ column }) => <ColumnHeader column={column} label="BPM" />,
    cell: ({ row }) => (
      <span className="tabular-nums">{Math.round(row.original.bpm)}</span>
    ),
  },
  {
    id: 'cs',
    accessorFn: (row) => row.cs,
    meta: ATTRIBUTE_COLUMN_META,
    header: ({ column }) => (
      <ColumnHeader column={column} label="CS" description="Circle size" />
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.cs.toFixed(1)}</span>
    ),
  },
  {
    id: 'ar',
    accessorFn: (row) => row.ar,
    meta: ATTRIBUTE_COLUMN_META,
    header: ({ column }) => (
      <ColumnHeader column={column} label="AR" description="Approach rate" />
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.ar.toFixed(1)}</span>
    ),
  },
  {
    id: 'od',
    accessorFn: (row) => row.od,
    meta: ATTRIBUTE_COLUMN_META,
    header: ({ column }) => (
      <ColumnHeader
        column={column}
        label="OD"
        description="Overall difficulty"
      />
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.od.toFixed(1)}</span>
    ),
  },
  {
    id: 'hp',
    accessorFn: (row) => row.hp,
    meta: ATTRIBUTE_COLUMN_META,
    header: ({ column }) => (
      <ColumnHeader column={column} label="HP" description="HP drain rate" />
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.hp.toFixed(1)}</span>
    ),
  },
  {
    id: 'mod',
    // Unplayed maps sort below every played one, in either direction's tail.
    accessorFn: (row) => row.topMod?.mod ?? -1,
    header: ({ column }) => (
      <ColumnHeader column={column} label="Mod" description="Most common mod" />
    ),
    cell: ({ row }) => {
      const topMod = row.original.topMod;
      return topMod ? (
        <SingleModIcon mods={topMod.mod} size={28} />
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    id: 'games',
    accessorFn: (row) => row.topMod?.gameCount ?? 0,
    meta: { cellClassName: 'hidden sm:table-cell' },
    header: ({ column }) => <ColumnHeader column={column} label="Games" />,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.topMod?.gameCount ?? 0}
      </span>
    ),
  },
];
