'use client';

import { Loader2, Target, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import ModIconset from '@/components/icons/ModIconset';
import { Button } from '@/components/ui/button';
import { orpc } from '@/lib/orpc/orpc';
import type { BeatmapTournamentMatch } from '@/lib/orpc/schema/beatmapStats';
import { formatUTCDate } from '@/lib/utils/date';

/** The games a beatmap was played in, revealed by expanding a pool record. */
export default function BeatmapPoolGamesPanel({
  beatmapOsuId,
  tournamentId,
  panelId,
}: {
  beatmapOsuId: number;
  tournamentId: number;
  panelId: string;
}) {
  const [matches, setMatches] = useState<BeatmapTournamentMatch[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (matches || error) return;

    let active = true;
    void orpc.beatmaps
      .tournamentMatches({
        beatmapId: beatmapOsuId,
        keyType: 'osu',
        tournamentId,
      })
      .then((response) => {
        if (active) setMatches(response.matches);
      })
      .catch(() => {
        if (active) setError(true);
      });

    return () => {
      active = false;
    };
  }, [beatmapOsuId, error, matches, tournamentId]);

  return (
    <div id={panelId} className="border-t bg-muted/15">
      {!matches && !error && (
        <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading games
        </div>
      )}
      {error && (
        <div className="px-4 py-6 text-center text-sm text-destructive">
          Games could not load.
          <Button
            type="button"
            variant="link"
            className="ml-1 h-auto p-0"
            onClick={() => setError(false)}
          >
            Retry
          </Button>
        </div>
      )}
      {matches?.length === 0 && (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          No games.
        </p>
      )}
      {matches && matches.length > 0 && (
        <div className="divide-y">
          {matches.flatMap((match) =>
            match.games.map((game) => (
              <Link
                key={game.gameId}
                href={`/matches/${match.matchId}?gameId=${game.gameId}`}
                prefetch={false}
                className="group/game grid grid-cols-[minmax(0,1fr)_auto] gap-2 px-4 py-3 transition-colors hover:bg-muted/35 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset sm:grid-cols-[minmax(0,1fr)_5rem_5rem_7rem_8rem] sm:items-center sm:gap-3"
              >
                <div className="col-span-2 min-w-0 sm:col-span-1">
                  <p className="truncate text-sm font-medium group-hover/game:underline">
                    {match.matchName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Game {game.gameNumber}
                    {match.startTime
                      ? ` · ${formatUTCDate(new Date(match.startTime))}`
                      : ''}
                  </p>
                </div>
                <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:contents">
                  <div className="flex h-5 w-14 items-center">
                    <ModIconset
                      mods={game.mods}
                      freemod={game.freemod}
                      className="flex h-full items-center"
                      iconClassName="h-5"
                    />
                  </div>
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                    <Users className="size-3.5" aria-hidden />
                    {game.playerCount}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                    <Target className="size-3.5" aria-hidden />
                    {game.avgRating !== null
                      ? `${game.avgRating.toLocaleString()} TR`
                      : 'No TR'}
                  </span>
                  <span className="font-mono tabular-nums sm:text-right">
                    {game.avgScore !== null
                      ? `${game.avgScore.toLocaleString()} avg`
                      : 'No score'}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
