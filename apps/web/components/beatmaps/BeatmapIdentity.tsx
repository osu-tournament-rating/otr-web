import { Music2, UserRound } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import BeatmapCover from '@/components/beatmaps/BeatmapCover';
import { cn } from '@/lib/utils';

/** `row` is the compact list row, `table` a table's leading cell. */
type BeatmapIdentitySize = 'row' | 'table';

/** A bare username cannot link anywhere; a player object can. */
type BeatmapCreator = { id: number; username: string } | string | null;

const COVER_DENSITY = {
  row: 2,
  table: 1,
} as const;

const ROOT_CLASS: Record<BeatmapIdentitySize, string> = {
  row: 'grid min-w-0 gap-2.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-stretch sm:gap-4 lg:grid-cols-[11rem_minmax(0,1fr)] xl:grid-cols-[12rem_minmax(0,1fr)]',
  table: 'flex min-w-0 items-center gap-3',
};

const COVER_CELL_CLASS: Record<BeatmapIdentitySize, string> = {
  row: 'relative min-w-0 sm:min-h-20',
  table: 'relative shrink-0',
};

const COVER_CLASS: Record<BeatmapIdentitySize, string> = {
  row: 'h-24 w-full rounded-lg shadow-sm sm:absolute sm:inset-0 sm:h-full',
  table: 'h-10 w-18 rounded-md shadow-sm',
};

const TEXT_CLASS: Record<BeatmapIdentitySize, string> = {
  row: 'min-w-0 sm:flex sm:flex-col sm:justify-center',
  table: 'min-w-0',
};

const HEADING_CLASS: Record<BeatmapIdentitySize, string> = {
  row: 'flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0',
  table: 'flex min-w-0 items-baseline gap-x-2',
};

/** Long text truncates wherever the surface has a fixed height. */
const CLIP_CLASS: Record<BeatmapIdentitySize, string> = {
  row: 'break-words',
  table: 'truncate',
};

/**
 * Cover art, title, difficulty, artist, and mapper. `children` renders inside
 * the cover cell, for the pills the list layouts overlay on their artwork.
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
  /** Hides the mapper row on surfaces where every row shares one mapper. */
  showMapper?: boolean;
  size: BeatmapIdentitySize;
  coverSizes: string;
  priority?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const clip = CLIP_CLASS[size];
  const isTable = size === 'table';
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
    // Every call site's row link and row testid key on the osu! id.
    <div
      data-beatmap-osu-id={osuId}
      className={cn(ROOT_CLASS[size], className)}
    >
      <div data-testid="beatmap-cover-cell" className={COVER_CELL_CLASS[size]}>
        <BeatmapCover
          beatmapsetOsuId={beatmapsetOsuId}
          alt={`${artist} - ${title} cover`}
          // Remote covers are `unoptimized`, so the derivative is the only size control.
          variant="card"
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
