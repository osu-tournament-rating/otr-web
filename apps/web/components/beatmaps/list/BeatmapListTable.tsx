'use client';

import Link from 'next/link';

import BeatmapIdentity from '@/components/beatmaps/BeatmapIdentity';
import BeatmapTopMods from '@/components/beatmaps/BeatmapTopMods';
import StarRatingPill from '@/components/beatmaps/StarRatingPill';
import BeatmapSortableHead from '@/components/beatmaps/list/BeatmapSortableHead';
import { Eyebrow } from '@/components/beatmap/BeatmapSection';
import RulesetIcon from '@/components/icons/RulesetIcon';
import SimpleTooltip from '@/components/simple-tooltip';
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
import type { BeatmapListItem } from '@/lib/orpc/schema/beatmapList';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/utils/date';

interface BeatmapListTableProps {
  beatmaps: BeatmapListItem[];
  sort: BeatmapListSortKey;
  descending: boolean;
  onSortChange: BeatmapListSortChange;
  className?: string;
}

/**
 * One class per column, shared by its header and its cells, so a width or a
 * breakpoint can only ever be changed in both at once. Every fixed width is its
 * widest content plus cell padding — measured, because the content box never
 * exceeds 1008px and the beatmap column lives on what the others leave behind.
 */
const COLUMN = {
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
 * The dense layout. Sorting is server-side over every row, not client-side over
 * the current page, so a header click reloads the page from the URL rather than
 * reordering the thirty rows already on screen.
 */
export default function BeatmapListTable({
  beatmaps,
  sort,
  descending,
  onSortChange,
  className,
}: BeatmapListTableProps) {
  const sortProps = { activeSort: sort, descending, onSortChange };

  return (
    <div className={className}>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {/* Not sortable: the server has no title sort. */}
            <TableHead className={cn('h-8', COLUMN.beatmap)}>
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
            <BeatmapSortableHead
              {...sortProps}
              sort="tournamentCount"
              label="Tournaments"
              className={COLUMN.tournaments}
            />
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
                className="group hover:bg-muted/25"
              >
                <TableCell className={COLUMN.beatmap}>
                  <Link
                    href={`/beatmaps/${beatmap.osuId}`}
                    prefetch={false}
                    aria-label={`View ${beatmap.artist} - ${beatmap.title} [${beatmap.diffName}]`}
                    // The link wraps the cover and four lines of text, so only
                    // the title takes the hover underline.
                    className="block rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:outline-none group-hover:[&_[data-testid=beatmap-title]]:underline"
                  >
                    <BeatmapIdentity
                      osuId={beatmap.osuId}
                      beatmapsetOsuId={beatmap.beatmapsetOsuId}
                      artist={beatmap.artist}
                      title={beatmap.title}
                      diffName={beatmap.diffName}
                      creator={beatmap.creator}
                      size="table"
                      coverSizes="40px"
                    />
                  </Link>
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
                  {beatmap.verifiedGameCount.toLocaleString()}
                </TableCell>
                <TableCell className={COLUMN.tournaments}>
                  {beatmap.verifiedTournamentCount.toLocaleString()}
                </TableCell>
                <TableCell className={COLUMN.mods}>
                  {isManiaRuleset(ruleset) ? null : (
                    // Only the dominant group: a second pill costs 72px, and
                    // the beatmap column is what pays for it.
                    <BeatmapTopMods
                      mods={(beatmap.topMods ?? []).slice(0, 1)}
                    />
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
