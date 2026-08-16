'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import VerificationBadge from '@/components/badges/VerificationBadge';
import { Eyebrow } from '@/components/beatmap/BeatmapSection';
import ModIconset from '@/components/icons/ModIconset';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatRankRangeBound } from '@/lib/beatmaps/rankRange';
import type { BeatmapTournamentUsage } from '@/lib/orpc/schema/beatmapStats';
import { formatChartNumber } from '@/lib/utils/chart';
import { formatUTCDate } from '@/lib/utils/date';
import { normalizeBeatmapDisplayMods } from '@/lib/utils/mods';
import { VerificationStatus } from '@otr/core/osu';

/**
 * Mirrors `Tile`'s chrome: the tile it replaces must look untouched at rest,
 * and `Tile` is a `<div>`. Keep in sync with BeatmapSection's `Tile`.
 */
const TRIGGER_CLASS =
  'relative cursor-pointer rounded-lg border bg-muted/25 px-3 py-2.5 text-left transition-colors hover:border-ring/40 hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none';

/** `2021-11-05 – 2021-12-18`, or one bound, or an em dash. */
function formatDateRange(startTime: string | null, endTime: string | null) {
  const start = startTime ? formatUTCDate(new Date(startTime)) : null;
  const end = endTime ? formatUTCDate(new Date(endTime)) : null;

  if (start && end) return `${start} – ${end}`;
  return start ?? end ?? '—';
}

/** Chronological, newest first; alphabetical within a tie, undated last. */
function byMostRecent(a: BeatmapTournamentUsage, b: BeatmapTournamentUsage) {
  const left = a.endTime ?? a.startTime;
  const right = b.endTime ?? b.startTime;

  if (left !== right) {
    if (left === null) return 1;
    if (right === null) return -1;
    // Timestamps share one server format, so string order is time order.
    return left < right ? 1 : -1;
  }

  return a.tournament.name.localeCompare(b.tournament.name);
}

/**
 * Every tournament that pooled the beatmap, behind the "Pooled in" tile.
 *
 * The rows come from the `pools` the overview card already holds — measured
 * ceiling is 83 on the busiest beatmap. If pool counts ever climb an order of
 * magnitude, that is the reason to split this into its own lazily-fetched
 * procedure rather than shipping it in the page payload.
 */
export default function BeatmapPoolsDialog({
  pools,
  accessibleValue,
  children,
}: {
  pools: BeatmapTournamentUsage[];
  /** Trigger's accessible name; byte-identical to the plain tile it replaces. */
  accessibleValue: string;
  /** The tile body, so the trigger reads as the tile it replaces. */
  children: React.ReactNode;
}) {
  // Sorts a copy: the server's most-played-first order is the public contract.
  const rows = React.useMemo(() => [...pools].sort(byMostRecent), [pools]);

  const verifiedCount = rows.filter(
    (row) => row.verificationStatus === VerificationStatus.Verified
  ).length;

  return (
    <Dialog>
      <DialogTrigger
        data-testid="beatmap-pool-records"
        aria-label={accessibleValue}
        className={TRIGGER_CLASS}
      >
        {children}
        {/* The section around this tile is frozen, so hover and focus are the
            only cues a touch user never gets. Absolute placement keeps the
            resting layout identical; translate-y-px centres the 14px glyph on
            the 16px label line. */}
        <ChevronRight
          className="absolute top-2.5 right-3 size-3.5 translate-y-px text-muted-foreground"
          aria-hidden
        />
      </DialogTrigger>

      {/* Six columns want room, so the cap grows on wide screens. The `min()`
          keeps DialogContent's own 1rem gutter: a bare `sm:max-w-3xl` wins the
          cascade over its `max-w-[calc(100%-2rem)]` base and goes edge-to-edge
          at exactly 768px. */}
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(48rem,calc(100%-2rem))] lg:max-w-[min(64rem,calc(100%-2rem))]">
        <DialogHeader className="gap-1 border-b px-4 py-3 pr-12 text-left">
          <DialogTitle className="text-base">
            {`Pooled in ${formatChartNumber(rows.length)} ${rows.length === 1 ? 'tournament' : 'tournaments'}`}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {`${formatChartNumber(verifiedCount)} verified`}
          </DialogDescription>
        </DialogHeader>

        {/* Focusable so the list scrolls by keyboard and Radix has a
            deterministic first focus target. */}
        <div
          tabIndex={0}
          className="min-h-0 flex-1 overflow-y-auto focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset"
        >
          <div className="hidden md:block">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead className="h-8 pl-4">
                    <Eyebrow>Tournament</Eyebrow>
                  </TableHead>
                  {/* Every fixed width is the measured content or header,
                      whichever is wider, plus the cell's own padding — the
                      slack all goes to the tournament name. */}
                  <TableHead className="h-8 w-48">
                    <Eyebrow>Dates</Eyebrow>
                  </TableHead>
                  <TableHead className="h-8 w-22">
                    <Eyebrow>Rank range</Eyebrow>
                  </TableHead>
                  <TableHead className="h-8 w-20">
                    <Eyebrow>Team size</Eyebrow>
                  </TableHead>
                  <TableHead className="h-8 w-20">
                    <Eyebrow>Mods</Eyebrow>
                  </TableHead>
                  <TableHead className="h-8 w-18 pr-4 text-right">
                    <Eyebrow>Games</Eyebrow>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.tournament.id}
                    className="hover:bg-muted/25"
                  >
                    <TableCell className="pl-4">
                      <div className="flex min-w-0 items-center gap-2">
                        <VerificationBadge
                          verificationStatus={row.verificationStatus}
                          rejectionReason={row.rejectionReason}
                          entityType="tournament"
                          size="small"
                        />
                        <Link
                          href={`/tournaments/${row.tournament.id}`}
                          prefetch={false}
                          title={row.tournament.name}
                          /* Wraps rather than truncates: the tournament is
                             what this dialog exists to show, and a third of
                             the names overflow one line at this width. */
                          className="line-clamp-2 min-w-0 rounded-sm text-sm leading-snug font-medium whitespace-normal hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          {row.tournament.name}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateRange(row.startTime, row.endTime)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatRankRangeBound(row.rankRangeLowerBound)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {`${row.lobbySize}v${row.lobbySize}`}
                    </TableCell>
                    <TableCell>
                      <PoolMods
                        mods={row.mostCommonMods}
                        freemod={row.mostCommonModsFreemod}
                        iconClassName="h-5"
                      />
                    </TableCell>
                    <TableCell className="pr-4 text-right text-xs text-muted-foreground">
                      {row.gameCount > 0
                        ? formatChartNumber(row.gameCount)
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Phones get two lines per pool: identity and games on top, the
              remaining details wrapping underneath. */}
          <ol className="divide-y md:hidden">
            {rows.map((row) => (
              <li key={row.tournament.id} className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <VerificationBadge
                    verificationStatus={row.verificationStatus}
                    rejectionReason={row.rejectionReason}
                    entityType="tournament"
                    size="small"
                  />
                  <Link
                    href={`/tournaments/${row.tournament.id}`}
                    prefetch={false}
                    title={row.tournament.name}
                    className="line-clamp-2 min-w-0 flex-1 rounded-sm text-sm leading-snug font-medium whitespace-normal hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {row.tournament.name}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {`${formatChartNumber(row.gameCount)} ${row.gameCount === 1 ? 'game' : 'games'}`}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                  <PoolMods
                    mods={row.mostCommonMods}
                    freemod={row.mostCommonModsFreemod}
                    iconClassName="h-4"
                  />
                  <span>{formatRankRangeBound(row.rankRangeLowerBound)}</span>
                  <span>{`${row.lobbySize}v${row.lobbySize}`}</span>
                  <span>{formatDateRange(row.startTime, row.endTime)}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Null mods means the pool was never played, so there is nothing to show. */
function PoolMods({
  mods,
  freemod,
  iconClassName,
}: {
  mods: number | null;
  freemod: boolean;
  iconClassName: string;
}) {
  if (mods === null)
    return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <ModIconset
      // Normalised the same way as every other mod surface on this page.
      mods={normalizeBeatmapDisplayMods(mods)}
      freemod={freemod}
      className="flex h-5 shrink-0 items-center"
      iconClassName={iconClassName}
      alwaysExpanded
    />
  );
}
