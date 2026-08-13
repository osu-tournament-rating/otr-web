import { Music2, UserRound } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import BeatmapCover from '@/components/beatmaps/BeatmapCover';
import { cn } from '@/lib/utils';

/**
 * `row` is the compact list row, `card` the card grid, `table` a single table
 * cell. Each picks a cover derivative, a cover geometry, and whether long text
 * truncates or wraps.
 *
 * `table-lead` is `table` with a thumbnail big enough to read the artwork,
 * for a table's leading column.
 */
type BeatmapIdentitySize = 'row' | 'card' | 'table' | 'table-lead';

/**
 * A bare username with no id (the beatmap list) cannot link anywhere; a player
 * object (tournament pools) can.
 */
type BeatmapCreator = { id: number; username: string } | string | null;

const COVER_VARIANT = {
  row: 'card',
  card: 'cover',
  table: 'list',
  // `list` is square, and cropping a square to a wide thumbnail throws away
  // most of the artwork; `card` at 1x is wide, sharp enough at this size, and
  // smaller over the wire than the square 2x it replaces.
  'table-lead': 'card',
} as const;

const COVER_DENSITY = {
  row: 2,
  card: 2,
  table: 2,
  'table-lead': 1,
} as const;

const ROOT_CLASS: Record<BeatmapIdentitySize, string> = {
  row: 'grid min-w-0 gap-2.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-stretch sm:gap-4 lg:grid-cols-[11rem_minmax(0,1fr)] xl:grid-cols-[12rem_minmax(0,1fr)]',
  card: 'flex min-w-0 flex-col',
  table: 'flex min-w-0 items-center gap-3',
  'table-lead': 'flex min-w-0 items-center gap-3',
};

const COVER_CELL_CLASS: Record<BeatmapIdentitySize, string> = {
  row: 'relative min-w-0 sm:min-h-20',
  card: 'relative min-w-0',
  table: 'relative shrink-0',
  'table-lead': 'relative shrink-0',
};

const COVER_CLASS: Record<BeatmapIdentitySize, string> = {
  row: 'h-24 w-full rounded-lg shadow-sm sm:absolute sm:inset-0 sm:h-full',
  card: 'aspect-[16/7] w-full rounded-none shadow-sm',
  table: 'h-[22px] w-10 rounded-sm',
  'table-lead': 'h-10 w-18 rounded-md shadow-sm',
};

const TEXT_CLASS: Record<BeatmapIdentitySize, string> = {
  row: 'min-w-0 sm:flex sm:flex-col sm:justify-center',
  card: 'min-w-0 px-3.5 pt-3.5 sm:px-4 sm:pt-4',
  table: 'min-w-0',
  'table-lead': 'min-w-0',
};

const HEADING_CLASS: Record<BeatmapIdentitySize, string> = {
  // One line per field so every card's text block is the same height and the
  // footer never shifts.
  card: 'min-w-0',
  row: 'flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0',
  table: 'flex min-w-0 items-baseline gap-x-2',
  'table-lead': 'flex min-w-0 items-baseline gap-x-2',
};

/** Long text truncates wherever the surface has a fixed height. */
const CLIP_CLASS: Record<BeatmapIdentitySize, string> = {
  row: 'break-words',
  card: 'truncate',
  table: 'truncate',
  'table-lead': 'truncate',
};

/**
 * Cover art, title, difficulty, artist, and mapper — the block that identifies
 * one beatmap on every surface that lists them.
 *
 * `children` renders inside the cover cell, for the pills and play button the
 * list layouts overlay on their artwork.
 */
export default function BeatmapIdentity({
  osuId,
  beatmapsetOsuId,
  artist,
  title,
  diffName,
  creator,
  showMapper = true,
  size,
  coverSizes,
  priority = false,
  className,
  children,
}: {
  osuId: number;
  beatmapsetOsuId?: number | null;
  artist: string;
  title: string;
  diffName: string;
  creator?: BeatmapCreator;
  /** A player's own mapped beatmaps all share one mapper, so that row is noise. */
  showMapper?: boolean;
  size: BeatmapIdentitySize;
  coverSizes: string;
  priority?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const clip = CLIP_CLASS[size];
  const isTable = size === 'table' || size === 'table-lead';
  const mapperName =
    typeof creator === 'string'
      ? creator
      : (creator?.username ?? 'Unknown mapper');

  const mapperLabel = (
    <span data-testid="beatmap-mapper-name" className={cn('min-w-0', clip)}>
      {mapperName}
    </span>
  );

  return (
    // The osu! id is not shown anywhere in the block, so it is exposed as an
    // attribute rather than dropped: it is what every call site's row link and
    // row testid are keyed on.
    <div
      data-beatmap-osu-id={osuId}
      className={cn(ROOT_CLASS[size], className)}
    >
      <div data-testid="beatmap-cover-cell" className={COVER_CELL_CLASS[size]}>
        <BeatmapCover
          beatmapsetOsuId={beatmapsetOsuId}
          alt={`${artist} - ${title} cover`}
          variant={COVER_VARIANT[size]}
          density={COVER_DENSITY[size]}
          sizes={coverSizes}
          priority={priority}
          className={COVER_CLASS[size]}
          imageClassName="transition-transform duration-500 group-hover:scale-[1.035]"
        />
        {children}
      </div>

      <div className={TEXT_CLASS[size]}>
        <div className="min-w-0">
          <div data-testid="beatmap-heading" className={HEADING_CLASS[size]}>
            <h2
              data-testid="beatmap-title"
              title={title}
              className={cn(
                'min-w-0 leading-snug font-semibold transition-colors group-hover:text-primary',
                isTable ? 'text-sm' : 'text-base sm:text-lg',
                clip
              )}
            >
              {title}
            </h2>
            <p
              data-testid="beatmap-difficulty-name"
              title={diffName}
              className={cn(
                'min-w-0 font-medium text-foreground/85',
                isTable ? 'text-xs' : 'text-sm',
                clip
              )}
            >
              [{diffName}]
            </p>
          </div>
          <div
            data-testid="beatmap-attribution"
            className={cn(
              'mt-0.5 flex min-w-0 items-center gap-x-3 text-xs text-muted-foreground',
              size === 'row' ? 'flex-wrap gap-y-0.5' : 'gap-y-0'
            )}
          >
            <p
              data-testid="beatmap-artist"
              title={artist}
              className={cn(
                'flex min-w-0 items-center gap-1.5',
                size !== 'row' && 'shrink'
              )}
            >
              <Music2 className="size-3.5 shrink-0" aria-hidden="true" />
              <span
                data-testid="beatmap-artist-name"
                className={cn('min-w-0', clip)}
              >
                {artist}
              </span>
            </p>
            {showMapper ? (
              <p
                data-testid="beatmap-mapper"
                title={mapperName}
                className={cn(
                  'flex min-w-0 items-center gap-1.5',
                  size !== 'row' && 'shrink'
                )}
              >
                <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
                {typeof creator === 'object' && creator !== null ? (
                  <Link
                    href={`/players/${creator.id}`}
                    prefetch={false}
                    className="flex min-w-0 rounded-sm transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {mapperLabel}
                  </Link>
                ) : (
                  mapperLabel
                )}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
