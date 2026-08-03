import Image from 'next/image';
import Link from 'next/link';

import { EmptyState, Eyebrow } from '@/components/beatmap/BeatmapSection';
import ModIconset from '@/components/icons/ModIconset';
import SimpleTooltip from '@/components/simple-tooltip';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import { ScoreGradeEnumHelper } from '@/lib/enum-helpers';
import type { BeatmapTopPerformer } from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';
import { formatUTCDate } from '@/lib/utils/date';
import { formatAccuracy } from '@/lib/utils/format';

/**
 * Seven columns of record data do not fit the rail layout at every width, so the
 * table keeps its own horizontal scroller from `sm` up and falls back to a
 * stacked row on phones.
 */
const SCORE_GRID =
  'grid grid-cols-[1.5rem_minmax(0,1.1fr)_2.75rem_6.25rem_3.25rem_minmax(0,1fr)_5.5rem] items-center gap-2';

/** The highest verified scores recorded on a beatmap, as a historical record. */
export default function BeatmapScoresTable({
  performers,
}: {
  performers: BeatmapTopPerformer[];
}) {
  if (performers.length === 0) {
    return <EmptyState>No score records.</EmptyState>;
  }

  return (
    <>
      <div className="hidden overflow-x-auto sm:block">
        <div className="min-w-[38rem]">
          <div
            aria-hidden
            className={cn('border-b bg-muted/20 px-4 py-2', SCORE_GRID)}
          >
            <Eyebrow>#</Eyebrow>
            <Eyebrow>Player</Eyebrow>
            <Eyebrow>Mods</Eyebrow>
            <Eyebrow className="text-right">Score</Eyebrow>
            <Eyebrow className="text-right">Acc</Eyebrow>
            <Eyebrow className="pl-1.5">Tournament</Eyebrow>
            <Eyebrow className="text-right">Played</Eyebrow>
          </div>

          <ol className="divide-y">
            {performers.map((performer, index) => (
              <li
                key={performer.scoreId}
                className={cn(
                  'group px-4 py-2 transition-colors hover:bg-muted/25',
                  SCORE_GRID
                )}
              >
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {index + 1}
                </span>

                <Link
                  href={`/players/${performer.player.id}`}
                  prefetch={false}
                  className="flex min-w-0 items-center gap-2 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <OsuAvatar
                    osuId={performer.player.osuId}
                    username={performer.player.username}
                    size={24}
                  />
                  <span className="truncate text-sm font-medium group-hover:underline">
                    {performer.player.username}
                  </span>
                </Link>

                <div
                  data-testid="beatmap-top-play-mods"
                  className="flex h-5 w-11 items-center"
                >
                  <ModIconset
                    mods={performer.mods}
                    className="flex h-full items-center"
                    iconClassName="h-5"
                  />
                </div>

                <Link
                  href={`/matches/${performer.matchId}?scoreId=${performer.scoreId}`}
                  prefetch={false}
                  aria-label={`View ${performer.player.username}'s recorded score`}
                  data-testid="beatmap-top-play-score"
                  className="flex items-center justify-end gap-1.5 rounded-sm font-mono text-sm font-semibold tabular-nums hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {performer.score.toLocaleString()}
                  <GradeIcon grade={performer.grade} />
                </Link>

                <span
                  data-testid="beatmap-top-play-accuracy"
                  className="text-right font-mono text-xs text-muted-foreground tabular-nums"
                >
                  {performer.accuracy !== null
                    ? formatAccuracy(performer.accuracy)
                    : '—'}
                </span>

                <Link
                  href={`/tournaments/${performer.tournament.id}`}
                  prefetch={false}
                  title={performer.tournament.name}
                  data-testid="beatmap-top-play-tournament"
                  className="truncate rounded-sm pl-1.5 text-xs hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {performer.tournament.name}
                </Link>

                <time
                  dateTime={performer.playedAt ?? undefined}
                  data-testid="beatmap-top-play-date"
                  className="text-right font-mono text-[11px] whitespace-nowrap text-muted-foreground tabular-nums"
                >
                  {performer.playedAt
                    ? formatUTCDate(new Date(performer.playedAt))
                    : '—'}
                </time>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <ol className="divide-y sm:hidden">
        {performers.map((performer, index) => (
          <li
            key={performer.scoreId}
            className="group px-4 py-3 transition-colors hover:bg-muted/25"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <Link
                href={`/players/${performer.player.id}`}
                prefetch={false}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <OsuAvatar
                  osuId={performer.player.osuId}
                  username={performer.player.username}
                  size={24}
                />
                <span className="truncate text-sm font-medium group-hover:underline">
                  {performer.player.username}
                </span>
              </Link>
              <Link
                href={`/matches/${performer.matchId}?scoreId=${performer.scoreId}`}
                prefetch={false}
                aria-label={`View ${performer.player.username}'s recorded score`}
                className="flex shrink-0 items-center gap-1.5 rounded-sm font-mono text-sm font-semibold tabular-nums hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {performer.score.toLocaleString()}
                <GradeIcon grade={performer.grade} />
              </Link>
            </div>

            <div className="mt-1.5 flex items-center gap-x-3 pl-7 font-mono text-xs text-muted-foreground tabular-nums">
              <div className="flex h-5 w-11 shrink-0 items-center">
                <ModIconset
                  mods={performer.mods}
                  className="flex h-full items-center"
                  iconClassName="h-5"
                />
              </div>
              <span>
                {performer.accuracy !== null
                  ? formatAccuracy(performer.accuracy)
                  : '—'}
              </span>
            </div>

            <div className="mt-1 flex items-baseline gap-2 pl-7">
              <Link
                href={`/tournaments/${performer.tournament.id}`}
                prefetch={false}
                className="min-w-0 truncate rounded-sm text-xs hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {performer.tournament.name}
              </Link>
              <time
                dateTime={performer.playedAt ?? undefined}
                className="ml-auto shrink-0 font-mono text-[11px] whitespace-nowrap text-muted-foreground tabular-nums"
              >
                {performer.playedAt
                  ? formatUTCDate(new Date(performer.playedAt))
                  : '—'}
              </time>
            </div>
          </li>
        ))}
      </ol>

      {/* The tab header already carries the full score count. */}
      <p className="border-t px-4 py-2 text-center font-mono text-xs text-muted-foreground tabular-nums">
        Showing the top {performers.length.toLocaleString()}
      </p>
    </>
  );
}

function GradeIcon({ grade }: { grade: BeatmapTopPerformer['grade'] }) {
  if (grade === undefined) {
    return (
      <SimpleTooltip content="Grade unavailable">
        <span className="font-mono text-xs text-muted-foreground">—</span>
      </SimpleTooltip>
    );
  }

  const gradeName = ScoreGradeEnumHelper.getMetadata(grade).text;

  return (
    <Image
      src={`/icons/grades/${gradeName}.svg`}
      alt={`Grade ${gradeName}`}
      width={24}
      height={24}
      className="size-5"
    />
  );
}
