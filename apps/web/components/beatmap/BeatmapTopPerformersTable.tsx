import { Ruleset } from '@otr/core/osu';
import { ArrowUpRight, ListOrdered } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import ModIconset from '@/components/icons/ModIconset';
import RulesetIcon from '@/components/icons/RulesetIcon';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import { ScoreGradeEnumHelper, RulesetEnumHelper } from '@/lib/enum-helpers';
import type { BeatmapTopPerformer } from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';
import { formatUTCDate } from '@/lib/utils/date';
import { formatAccuracy } from '@/lib/utils/format';

interface BeatmapTopPerformersTableProps {
  performers: BeatmapTopPerformer[];
  ruleset: Ruleset;
  totalScoreCount: number;
  className?: string;
}

function GradeIcon({ grade }: { grade: BeatmapTopPerformer['grade'] }) {
  if (grade === undefined) {
    return (
      <span
        className="font-mono text-xs text-muted-foreground"
        aria-label="Grade unavailable"
      >
        —
      </span>
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

export default function BeatmapTopPerformersTable({
  performers,
  ruleset,
  totalScoreCount,
  className,
}: BeatmapTopPerformersTableProps) {
  const rulesetName = RulesetEnumHelper.getMetadata(ruleset).text;

  return (
    <section
      data-testid="beatmap-top-performers"
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-sm dark:shadow-none',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <ListOrdered
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <h2 className="font-semibold">Highest recorded scores</h2>
        </div>
        <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          Top {performers.length.toLocaleString()} of{' '}
          {totalScoreCount.toLocaleString()} scores
        </span>
      </div>

      {performers.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          No score records.
        </p>
      ) : (
        <>
          <div
            aria-hidden="true"
            className="hidden border-b bg-muted/30 lg:block"
          >
            <div className="mx-auto grid max-w-5xl grid-cols-[2rem_3rem_3rem_minmax(10rem,15rem)_8rem_5.5rem_4.5rem_6.75rem_5.5rem] gap-3 px-4 py-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              <span>#</span>
              <span className="text-center">Grade</span>
              <span className="text-center">Mode</span>
              <span>Player</span>
              <span className="text-right">Score</span>
              <span className="text-right">Accuracy</span>
              <span>Mods</span>
              <span>Played</span>
              <span className="text-right">Match</span>
            </div>
          </div>
          <ol className="divide-y">
            {performers.map((performer, index) => (
              <li
                key={performer.scoreId}
                className="group transition-colors hover:bg-muted/25"
              >
                <div className="mx-auto grid max-w-5xl grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 px-4 py-3 lg:grid-cols-[2rem_3rem_3rem_minmax(10rem,15rem)_8rem_5.5rem_4.5rem_6.75rem_5.5rem] lg:gap-3">
                  <span className="font-mono text-xs font-semibold text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>

                  <div className="hidden items-center justify-center lg:flex">
                    <GradeIcon grade={performer.grade} />
                  </div>

                  <div className="hidden items-center justify-center lg:flex">
                    <RulesetIcon
                      ruleset={ruleset}
                      className="size-4 fill-current text-muted-foreground"
                      role="img"
                      aria-label={rulesetName}
                    />
                  </div>

                  <Link
                    href={`/players/${performer.player.id}`}
                    prefetch={false}
                    className="flex min-w-0 items-center gap-2 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <OsuAvatar
                      osuId={performer.player.osuId}
                      username={performer.player.username}
                      size={28}
                    />
                    <span className="truncate font-medium group-hover:underline">
                      {performer.player.username}
                    </span>
                  </Link>

                  <Link
                    href={`/matches/${performer.matchId}?scoreId=${performer.scoreId}`}
                    prefetch={false}
                    aria-label={`View ${performer.player.username}'s recorded score`}
                    data-testid="beatmap-top-play-score"
                    className="inline-flex items-center justify-self-end rounded-sm font-mono text-sm font-semibold tabular-nums hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:w-full lg:justify-end"
                  >
                    {performer.score.toLocaleString()}
                    <ArrowUpRight
                      className="ml-1 size-3.5 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </Link>

                  <div className="col-span-3 col-start-1 grid min-w-0 grid-cols-[2.5rem_3rem_3rem_minmax(0,1fr)_3.5rem] items-center gap-x-1 text-xs text-muted-foreground lg:contents">
                    <div className="flex items-center gap-1 lg:hidden">
                      <RulesetIcon
                        ruleset={ruleset}
                        className="size-4 fill-current"
                        role="img"
                        aria-label={rulesetName}
                      />
                      <GradeIcon grade={performer.grade} />
                    </div>
                    <span
                      data-testid="beatmap-top-play-accuracy"
                      className="font-mono tabular-nums lg:text-right"
                    >
                      {performer.accuracy !== null
                        ? formatAccuracy(performer.accuracy)
                        : '—'}
                    </span>
                    <div
                      data-testid="beatmap-top-play-mods"
                      className="flex h-5 w-11 items-center lg:w-16"
                    >
                      <ModIconset
                        mods={performer.mods}
                        className="flex h-full items-center"
                        iconClassName="h-5"
                      />
                    </div>
                    <time
                      data-testid="beatmap-top-play-date"
                      dateTime={performer.playedAt ?? undefined}
                      className="truncate font-mono text-[11px] tabular-nums lg:text-xs"
                    >
                      {performer.playedAt
                        ? formatUTCDate(new Date(performer.playedAt))
                        : 'Unavailable'}
                    </time>
                    <Link
                      href={`/matches/${performer.matchId}?scoreId=${performer.scoreId}`}
                      prefetch={false}
                      data-testid="beatmap-top-play-match"
                      aria-label={`Match ${performer.matchId}`}
                      className="justify-self-end truncate rounded-sm font-mono text-[10px] tabular-nums hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:w-full lg:text-right lg:text-xs"
                    >
                      #{performer.matchId}
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
