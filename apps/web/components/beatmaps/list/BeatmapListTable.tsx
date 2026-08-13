'use client';

import Link from 'next/link';

import BeatmapCoverPreview from '@/components/beatmaps/BeatmapCoverPreview';
import BeatmapIdentity from '@/components/beatmaps/BeatmapIdentity';
import BeatmapTopMods from '@/components/beatmaps/BeatmapTopMods';
import StarRatingPill from '@/components/beatmaps/StarRatingPill';
import BeatmapSortableHead from '@/components/beatmaps/list/BeatmapSortableHead';
import { Eyebrow } from '@/components/beatmap/BeatmapSection';
import RulesetIcon from '@/components/icons/RulesetIcon';
import SimpleTooltip from '@/components/simple-tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  BeatmapListSortChange,
  BeatmapListSortKey,
} from '@/lib/beatmaps/list-params';
import {
  getBeatmapDisplayRuleset,
  getBeatmapRulesetLabel,
  isManiaRuleset,
} from '@/lib/beatmaps/presentation';
import type { BeatmapTableRow } from '@/lib/beatmaps/table-row';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/utils/date';

/** Row selection, for the surfaces that let an admin act on a set of rows. */
export interface BeatmapTableSelection {
  isSelected: (row: BeatmapTableRow) => boolean;
  onSelect: (row: BeatmapTableRow, checked: boolean) => void;
  allSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  /** Names a row inside its checkbox's accessible label. */
  getRowLabel: (row: BeatmapTableRow) => string;
}

interface BeatmapListTableProps {
  beatmaps: BeatmapTableRow[];
  sort: BeatmapListSortKey;
  descending: boolean;
  onSortChange: BeatmapListSortChange;
  /** A single tournament's pool has nothing to count here. */
  showTournamentCount?: boolean;
  selection?: BeatmapTableSelection;
  /**
   * A floor for the table's own width, for callers that render it below `sm`.
   * The layout is fixed-width, so without one the leading column is squeezed to
   * nothing rather than the table scrolling inside its container.
   */
  minWidthClassName?: string;
  className?: string;
}

/**
 * One class per column, shared by its header and its cells, so a width or a
 * breakpoint can only ever be changed in both at once. Every fixed width is its
 * widest content plus cell padding — measured, because the content box never
 * exceeds 1008px and the beatmap column lives on what the others leave behind.
 */
const COLUMN = {
  select: 'w-11 pl-4',
  beatmap: 'pl-4',
  mode: 'w-13',
  sr: 'w-22 text-right',
  bpm: 'w-17 text-right tabular-nums',
  length: 'w-20 text-right tabular-nums',
  cs: 'hidden w-15 text-right tabular-nums xl:table-cell',
  ar: 'hidden w-15 text-right tabular-nums xl:table-cell',
  games: 'w-20 text-right tabular-nums',
  tournaments: 'hidden w-29 text-right tabular-nums md:table-cell',
  mods: 'hidden w-34 pr-3 lg:table-cell',
} as const;

/**
 * The dense layout, shared by the beatmap list and a tournament's pool. Sorting
 * is the caller's: the list writes it to the URL and reloads server-sorted rows,
 * while a pool the caller already holds in full sorts in place.
 */
export default function BeatmapListTable({
  beatmaps,
  sort,
  descending,
  onSortChange,
  showTournamentCount = true,
  selection,
  minWidthClassName,
  className,
}: BeatmapListTableProps) {
  const sortProps = { activeSort: sort, descending, onSortChange };

  return (
    <div className={className}>
      <Table className={cn('table-fixed', minWidthClassName)}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {selection ? (
              <TableHead className={cn('h-8', COLUMN.select)}>
                <Checkbox
                  data-testid="beatmap-table-select-all"
                  checked={selection.allSelected}
                  onCheckedChange={(checked) =>
                    selection.onSelectAll(checked === true)
                  }
                  aria-label="Select all beatmaps"
                />
              </TableHead>
            ) : null}
            {/* Not sortable: the server has no title sort. */}
            <TableHead
              className={cn('h-8', selection ? 'pl-1' : COLUMN.beatmap)}
            >
              <Eyebrow>Beatmap</Eyebrow>
            </TableHead>
            <TableHead className={cn('h-8', COLUMN.mode)}>
              <Eyebrow>Mode</Eyebrow>
            </TableHead>
            <BeatmapSortableHead
              {...sortProps}
              sort="sr"
              label="SR"
              className={COLUMN.sr}
            />
            <BeatmapSortableHead
              {...sortProps}
              sort="bpm"
              label="BPM"
              className={COLUMN.bpm}
            />
            <BeatmapSortableHead
              {...sortProps}
              sort="length"
              label="Length"
              className={COLUMN.length}
            />
            <BeatmapSortableHead
              {...sortProps}
              sort="cs"
              label="CS"
              className={COLUMN.cs}
            />
            <BeatmapSortableHead
              {...sortProps}
              sort="ar"
              label="AR"
              className={COLUMN.ar}
            />
            <BeatmapSortableHead
              {...sortProps}
              sort="gameCount"
              label="Games"
              className={COLUMN.games}
            />
            {showTournamentCount ? (
              <BeatmapSortableHead
                {...sortProps}
                sort="tournamentCount"
                label="Tournaments"
                className={COLUMN.tournaments}
              />
            ) : null}
            <TableHead className={cn('h-8', COLUMN.mods)}>
              <Eyebrow>Mods</Eyebrow>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {beatmaps.map((beatmap) => {
            const ruleset = getBeatmapDisplayRuleset(
              beatmap.ruleset,
              beatmap.diffName
            );
            const rulesetLabel = getBeatmapRulesetLabel(
              beatmap.ruleset,
              beatmap.diffName
            );

            return (
              <TableRow
                key={beatmap.id}
                data-testid={`beatmap-list-row-${beatmap.osuId}`}
                data-state={
                  selection?.isSelected(beatmap) ? 'selected' : undefined
                }
                className="group hover:bg-muted/25"
              >
                {selection ? (
                  <TableCell className={COLUMN.select}>
                    <Checkbox
                      checked={selection.isSelected(beatmap)}
                      onCheckedChange={(checked) =>
                        selection.onSelect(beatmap, checked === true)
                      }
                      aria-label={`Select ${selection.getRowLabel(beatmap)}`}
                    />
                  </TableCell>
                ) : null}

                {/* The link is an overlay rather than a wrapper so the cover's
                    preview button is a sibling of it and not a button nested
                    inside an anchor. */}
                <TableCell
                  className={cn(
                    selection ? 'pl-1' : COLUMN.beatmap,
                    // The link covers the cover and four lines of text, so only
                    // the title takes the hover underline.
                    'relative group-hover:[&_[data-testid=beatmap-title]]:underline',
                    beatmap.isDeleted &&
                      '[&_[data-testid=beatmap-title]]:text-muted-foreground [&_[data-testid=beatmap-title]]:line-through'
                  )}
                >
                  <Link
                    href={`/beatmaps/${beatmap.osuId}`}
                    prefetch={false}
                    aria-label={`View ${beatmap.artist} - ${beatmap.title} [${beatmap.diffName}]`}
                    className="absolute inset-0 z-10 rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:outline-none focus-visible:ring-inset"
                  />
                  <div className="flex min-w-0 items-center gap-2">
                    <BeatmapIdentity
                      osuId={beatmap.osuId}
                      beatmapsetOsuId={beatmap.beatmapsetOsuId}
                      artist={beatmap.artist}
                      title={beatmap.title}
                      diffName={beatmap.diffName}
                      creator={beatmap.creator}
                      size="table-lead"
                      coverSizes="72px"
                      className="min-w-0 flex-1"
                    >
                      <BeatmapCoverPreview
                        beatmapsetOsuId={beatmap.beatmapsetOsuId}
                        artist={beatmap.artist}
                        title={beatmap.title}
                        difficulty={beatmap.diffName}
                        size="sm"
                        className="rounded-md"
                      />
                    </BeatmapIdentity>
                    {beatmap.isDeleted ? (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        Deleted
                      </span>
                    ) : null}
                  </div>
                </TableCell>

                <TableCell className={COLUMN.mode}>
                  <SimpleTooltip content={rulesetLabel}>
                    <span className="inline-flex text-muted-foreground">
                      <RulesetIcon
                        ruleset={ruleset}
                        className="size-4 fill-current"
                        aria-hidden="true"
                      />
                      {/* The mode must not be tooltip-only. */}
                      <span className="sr-only">{rulesetLabel}</span>
                    </span>
                  </SimpleTooltip>
                </TableCell>

                <TableCell className={COLUMN.sr}>
                  <StarRatingPill starRating={beatmap.sr} />
                </TableCell>
                <TableCell className={COLUMN.bpm}>
                  {Math.round(beatmap.bpm)}
                </TableCell>
                <TableCell className={COLUMN.length}>
                  {formatDuration(Number(beatmap.totalLength))}
                </TableCell>
                <TableCell className={COLUMN.cs}>
                  {beatmap.cs.toFixed(1)}
                </TableCell>
                <TableCell className={COLUMN.ar}>
                  {beatmap.ar.toFixed(1)}
                </TableCell>
                <TableCell className={COLUMN.games}>
                  {beatmap.gameCount.toLocaleString()}
                </TableCell>
                {showTournamentCount ? (
                  <TableCell className={COLUMN.tournaments}>
                    {beatmap.tournamentCount.toLocaleString()}
                  </TableCell>
                ) : null}
                <TableCell className={COLUMN.mods}>
                  {isManiaRuleset(ruleset) ? null : (
                    // Only the dominant group: a second pill costs 72px, and
                    // the beatmap column is what pays for it.
                    <BeatmapTopMods mods={beatmap.topMods.slice(0, 1)} />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
