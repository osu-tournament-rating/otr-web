'use client';

import { Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Eyebrow } from '@/components/beatmap/BeatmapSection';
import ModIconset from '@/components/icons/ModIconset';
import TierIcon from '@/components/icons/TierIcon';
import { Button } from '@/components/ui/button';
import { orpc } from '@/lib/orpc/orpc';
import type { BeatmapTournamentMatch } from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';
import { formatUTCDate } from '@/lib/utils/date';
import { getTierFromRating } from '@/lib/utils/tierData';

const PLAYED_HINT = 'When the match was played';
const LOBBY_HINT = 'Average pre-match rating across the lobby';
const AVG_SCORE_HINT = 'Average score set on this map in the game';

/**
 * A nested panel this deep should not run away with the page, so long pools
 * reveal in one shot behind a button. Internal scrolling is deliberately
 * avoided — it is hostile on touch and hides rows from find-in-page.
 */
const GAME_ROW_CAP = 10;

/**
 * Header and rows render from this one template so the captions can never
 * drift out of alignment with the cells. Each row is a single link to its
 * game, which rules out a semantic `ui/table` here (a `<tr>` cannot be an
 * anchor), so the columns are sized explicitly instead:
 * phones — match name | lobby rating (5.5rem) | avg score (6.5rem);
 * sm+ adds played date (6.5rem) and mod icons (3.5rem), lobby tightens to 6rem.
 */
const GAME_GRID =
  'grid grid-cols-[minmax(0,1fr)_5.5rem_6.5rem] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_6.5rem_3.5rem_6rem_6.5rem]';

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
  const [showAll, setShowAll] = useState(false);

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

  // Rows are games, not matches, so the cap counts what the reader actually
  // sees rather than how the response happens to be grouped.
  const rows = (matches ?? []).flatMap((match) =>
    match.games.map((game) => ({ match, game }))
  );
  const visibleRows = showAll ? rows : rows.slice(0, GAME_ROW_CAP);

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
        <>
          <div aria-hidden className={cn('border-b px-4 py-2', GAME_GRID)}>
            <Eyebrow>Match</Eyebrow>
            <Eyebrow title={PLAYED_HINT} className="hidden text-right sm:block">
              Played
            </Eyebrow>
            <Eyebrow className="hidden sm:block">Mod</Eyebrow>
            <Eyebrow title={LOBBY_HINT}>Avg rating</Eyebrow>
            <Eyebrow title={AVG_SCORE_HINT} className="text-right">
              Avg score
            </Eyebrow>
          </div>
          <div className="divide-y">
            {visibleRows.map(({ match, game }) => (
              <Link
                key={game.gameId}
                href={`/matches/${match.matchId}?gameId=${game.gameId}`}
                prefetch={false}
                className={cn(
                  'group/game px-4 py-2.5 transition-colors hover:bg-muted/35 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset',
                  GAME_GRID
                )}
              >
                <span
                  title={match.matchName}
                  className="truncate text-sm font-medium group-hover/game:underline"
                >
                  {match.matchName}
                </span>
                <span className="hidden text-right text-xs text-muted-foreground tabular-nums sm:block">
                  {match.startTime
                    ? formatUTCDate(new Date(match.startTime))
                    : '—'}
                </span>
                <span className="hidden h-5 items-center sm:flex">
                  <ModIconset
                    mods={game.mods}
                    freemod={game.freemod}
                    className="flex h-full items-center"
                    iconClassName="h-5"
                  />
                </span>
                <LobbyRating rating={game.avgRating} />
                <span className="text-right text-sm tabular-nums">
                  {game.avgScore !== null
                    ? game.avgScore.toLocaleString()
                    : '—'}
                </span>
              </Link>
            ))}
          </div>
          {rows.length > GAME_ROW_CAP && !showAll && (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setShowAll(true)}
              >
                <Plus aria-hidden />
                Show all {rows.length.toLocaleString()}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** The lobby's average pre-match rating, anchored by its tier icon. */
function LobbyRating({ rating }: { rating: number | null }) {
  if (rating === null) {
    return (
      <span title={LOBBY_HINT} className="text-xs text-muted-foreground">
        —
      </span>
    );
  }

  const { tier, subTier } = getTierFromRating(rating);

  return (
    <span title={LOBBY_HINT} className="inline-flex items-center gap-1.5">
      <TierIcon
        tier={tier}
        subTier={subTier}
        tooltip
        width={18}
        height={18}
        className="shrink-0"
      />
      <span className="text-sm tabular-nums">
        {Math.round(rating).toLocaleString()}
      </span>
    </span>
  );
}
