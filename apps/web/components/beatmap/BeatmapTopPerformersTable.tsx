import { Medal, MoveUpRight } from 'lucide-react';
import Link from 'next/link';

import ModIconset from '@/components/icons/ModIconset';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import type { BeatmapTopPerformer } from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';
import { formatAccuracy } from '@/lib/utils/format';

interface BeatmapTopPerformersTableProps {
  performers: BeatmapTopPerformer[];
  className?: string;
}

export default function BeatmapTopPerformersTable({
  performers,
  className,
}: BeatmapTopPerformersTableProps) {
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
          <Medal className="size-4 text-primary" aria-hidden="true" />
          <h2 className="font-semibold">Top plays</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {performers.length} shown
        </span>
      </div>

      {performers.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          No scores.
        </p>
      ) : (
        <ol className="divide-y">
          {performers.map((performer, index) => (
            <li
              key={performer.scoreId}
              className="group grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 px-4 py-3 transition-colors hover:bg-muted/35 sm:grid-cols-[2rem_minmax(0,1fr)_8rem_8rem] sm:gap-4 dark:hover:bg-secondary/60"
            >
              <span className="font-mono text-xs font-semibold text-muted-foreground">
                #{index + 1}
              </span>
              <Link
                href={`/players/${performer.player.id}`}
                prefetch={false}
                className="flex min-w-0 items-center gap-2 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <OsuAvatar
                  osuId={performer.player.osuId}
                  username={performer.player.username}
                  size={32}
                />
                <span className="truncate font-medium group-hover:text-primary">
                  {performer.player.username}
                </span>
              </Link>

              <div
                data-testid="beatmap-top-play-metrics"
                className="col-start-2 flex items-center gap-3 text-xs text-muted-foreground sm:col-start-auto sm:w-full sm:justify-end"
              >
                <span className="tabular-nums">
                  {performer.accuracy !== null
                    ? formatAccuracy(performer.accuracy)
                    : '—'}
                </span>
                <div className="flex h-5 w-14 items-center">
                  <ModIconset
                    mods={performer.mods}
                    className="flex h-full items-center"
                    iconClassName="h-5"
                  />
                </div>
              </div>

              <Link
                href={`/matches/${performer.matchId}?scoreId=${performer.scoreId}`}
                prefetch={false}
                aria-label={`View ${performer.player.username}'s score`}
                data-testid="beatmap-top-play-score"
                className="col-start-2 inline-flex items-center gap-1 justify-self-start rounded-sm font-mono text-sm font-semibold text-primary tabular-nums hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:col-start-auto sm:w-full sm:justify-end sm:justify-self-end"
              >
                {performer.score.toLocaleString()}
                <MoveUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
