import { Medal } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import {
  EmptyState,
  Eyebrow,
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
import ModIconset from '@/components/icons/ModIconset';
import SimpleTooltip from '@/components/simple-tooltip';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScoreGradeEnumHelper } from '@/lib/enum-helpers';
import type { BeatmapTopPerformer } from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';
import { formatChartNumber } from '@/lib/utils/chart';
import { formatUTCDate } from '@/lib/utils/date';
import { formatAccuracy } from '@/lib/utils/format';

type DisplayRank = {
  /** Rendered numeral, prefixed with `=` when the position is shared. */
  label: string;
  /** Competition position, so ties share the podium treatment. */
  position: number;
};

/**
 * Competition ranks with tie flags: equal scores share the first position of
 * their run, and the next distinct score resumes at its real position
 * (…, 6, =7, =7, =7, 14, …). The server already returns the list in score
 * order, so a linear walk is enough.
 */
function computeDisplayRanks(performers: BeatmapTopPerformer[]): DisplayRank[] {
  return performers.map((performer, index) => {
    let start = index;
    while (start > 0 && performers[start - 1].score === performer.score)
      start -= 1;
    const tied =
      (index > 0 && performers[index - 1].score === performer.score) ||
      (index + 1 < performers.length &&
        performers[index + 1].score === performer.score);
    return { label: `${tied ? '=' : ''}${start + 1}`, position: start + 1 };
  });
}

/**
 * Rank numeral with three steps of emphasis. The numeral and tie prefix carry
 * the ranking on their own, so color is never the only cue.
 */
function RankBadge({
  rank,
  className,
}: {
  rank: DisplayRank;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-6 items-center justify-center rounded-md px-1 text-xs tabular-nums',
        rank.position === 1
          ? 'bg-primary/15 font-semibold text-primary'
          : rank.position <= 3
            ? 'font-medium text-foreground'
            : 'text-muted-foreground',
        className
      )}
    >
      {rank.label}
    </span>
  );
}

/** The highest verified scores recorded on a beatmap, ranked. */
export default function BeatmapLeaderboardCard({
  performers,
  totalScoreCount,
}: {
  performers: BeatmapTopPerformer[];
  /** Every verified score on the beatmap, not just the ranked slice below. */
  totalScoreCount: number;
}) {
  const ranks = computeDisplayRanks(performers);

  return (
    <SectionCard data-testid="beatmap-leaderboard">
      <SectionHeader
        icon={Medal}
        title="Leaderboard"
        meta={
          performers.length < totalScoreCount
            ? `top ${formatChartNumber(performers.length)} of ${formatChartNumber(totalScoreCount)} scores`
            : `${formatChartNumber(totalScoreCount)} ${
                totalScoreCount === 1 ? 'score' : 'scores'
              }`
        }
      />

      {performers.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Seven columns need a scroll container from sm up; phones get the stacked list below. */}
          <div className="hidden sm:block">
            <Table className="min-w-[39rem] table-fixed">
              <TableHeader>
                {/* Fixed widths must cover the cell's own padding (p-2, plus
                    the pl-4/pr-4 on the edge columns) on top of the content, or
                    the last column's dates clip against the card edge. */}
                <TableRow className="bg-muted/20">
                  {/* Wide enough for the `=` a tie prefix adds to the rank. */}
                  <TableHead className="h-8 w-12 pl-4">
                    <Eyebrow>#</Eyebrow>
                  </TableHead>
                  <TableHead className="h-8">
                    <Eyebrow>Player</Eyebrow>
                  </TableHead>
                  {/* Wide enough for three mod icons in their hover-expanded
                      state, so fanning them out never overlaps the score. */}
                  <TableHead className="h-8 w-20">
                    <Eyebrow>Mods</Eyebrow>
                  </TableHead>
                  <TableHead className="h-8 w-29 text-right">
                    <Eyebrow>Score</Eyebrow>
                  </TableHead>
                  <TableHead className="h-8 w-17 text-right">
                    <Eyebrow>Acc</Eyebrow>
                  </TableHead>
                  <TableHead className="h-8">
                    <Eyebrow>Tournament</Eyebrow>
                  </TableHead>
                  <TableHead className="h-8 w-28 pr-4 text-right">
                    <Eyebrow>Played</Eyebrow>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performers.map((performer, index) => {
                  const displayName = (performer.player.username ?? '').trim();

                  return (
                    <TableRow
                      key={performer.scoreId}
                      className="group hover:bg-muted/25"
                    >
                      <TableCell className="pl-4">
                        <RankBadge rank={ranks[index]} />
                      </TableCell>

                      <TableCell>
                        <Link
                          href={`/players/${performer.player.id}`}
                          prefetch={false}
                          className="flex min-w-0 items-center gap-2 rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          <OsuAvatar
                            osuId={performer.player.osuId}
                            username={performer.player.username}
                            size={24}
                          />
                          <span
                            className={cn(
                              'truncate text-sm group-hover:underline',
                              displayName
                                ? 'font-medium'
                                : 'text-muted-foreground italic'
                            )}
                          >
                            {displayName || 'Unknown player'}
                          </span>
                        </Link>
                      </TableCell>

                      <TableCell>
                        <div
                          data-testid="beatmap-top-play-mods"
                          className="flex h-5 w-16 items-center"
                        >
                          <ModIconset
                            mods={performer.mods}
                            className="flex h-full items-center"
                            iconClassName="h-5"
                          />
                        </div>
                      </TableCell>

                      <TableCell>
                        <Link
                          href={`/matches/${performer.matchId}?scoreId=${performer.scoreId}`}
                          prefetch={false}
                          aria-label={`View ${displayName || 'Unknown player'}'s recorded score`}
                          data-testid="beatmap-top-play-score"
                          className="flex items-center justify-end gap-1.5 rounded-sm text-sm font-semibold hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          {formatChartNumber(performer.score)}
                          <GradeIcon grade={performer.grade} />
                        </Link>
                      </TableCell>

                      <TableCell
                        data-testid="beatmap-top-play-accuracy"
                        className="text-right text-xs text-muted-foreground"
                      >
                        {performer.accuracy !== null
                          ? formatAccuracy(performer.accuracy)
                          : '—'}
                      </TableCell>

                      <TableCell>
                        <Link
                          href={`/tournaments/${performer.tournament.id}`}
                          prefetch={false}
                          title={performer.tournament.name}
                          data-testid="beatmap-top-play-tournament"
                          className="block truncate rounded-sm text-xs hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          {performer.tournament.name}
                        </Link>
                      </TableCell>

                      <TableCell className="pr-4 text-right">
                        <time
                          dateTime={performer.playedAt ?? undefined}
                          data-testid="beatmap-top-play-date"
                          className="text-xs whitespace-nowrap text-muted-foreground"
                        >
                          {performer.playedAt
                            ? formatUTCDate(new Date(performer.playedAt))
                            : '—'}
                        </time>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Phones get two dense lines per score: identity and score on top,
              the remaining details in one muted row underneath. */}
          <ol className="divide-y sm:hidden">
            {performers.map((performer, index) => {
              const displayName = (performer.player.username ?? '').trim();

              return (
                <li
                  key={performer.scoreId}
                  className="group px-4 py-2 transition-colors hover:bg-muted/25"
                >
                  <div className="flex items-center gap-2">
                    <RankBadge rank={ranks[index]} className="shrink-0" />
                    <Link
                      href={`/players/${performer.player.id}`}
                      prefetch={false}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <OsuAvatar
                        osuId={performer.player.osuId}
                        username={performer.player.username}
                        size={20}
                      />
                      <span
                        className={cn(
                          'truncate text-sm group-hover:underline',
                          displayName
                            ? 'font-medium'
                            : 'text-muted-foreground italic'
                        )}
                      >
                        {displayName || 'Unknown player'}
                      </span>
                    </Link>
                    <Link
                      href={`/matches/${performer.matchId}?scoreId=${performer.scoreId}`}
                      prefetch={false}
                      aria-label={`View ${displayName || 'Unknown player'}'s recorded score`}
                      className="flex shrink-0 items-center gap-1 rounded-sm text-sm font-semibold hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      {formatChartNumber(performer.score)}
                      <GradeIcon grade={performer.grade} />
                    </Link>
                  </div>

                  <div className="mt-1 flex items-center gap-2 pl-8 text-xs text-muted-foreground">
                    <ModIconset
                      mods={performer.mods}
                      className="flex h-4 shrink-0 items-center"
                      iconClassName="h-4"
                    />
                    <span className="shrink-0">
                      {performer.accuracy !== null
                        ? formatAccuracy(performer.accuracy)
                        : '—'}
                    </span>
                    <Link
                      href={`/tournaments/${performer.tournament.id}`}
                      prefetch={false}
                      title={performer.tournament.name}
                      className="min-w-0 flex-1 truncate rounded-sm font-sans hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      {performer.tournament.name}
                    </Link>
                    <time
                      dateTime={performer.playedAt ?? undefined}
                      className="shrink-0 text-xs whitespace-nowrap"
                    >
                      {performer.playedAt
                        ? formatUTCDate(new Date(performer.playedAt))
                        : '—'}
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </SectionCard>
  );
}

function GradeIcon({ grade }: { grade: BeatmapTopPerformer['grade'] }) {
  if (grade === undefined) {
    return (
      <SimpleTooltip content="Grade unavailable">
        <span className="text-xs text-muted-foreground">—</span>
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
