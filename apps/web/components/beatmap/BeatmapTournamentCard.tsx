'use client';

import { VerificationStatus } from '@otr/core/osu';
import {
  ArrowUpRight,
  ChevronDown,
  Loader2,
  Target,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import VerificationBadge from '@/components/badges/VerificationBadge';
import ModIconset from '@/components/icons/ModIconset';
import RulesetIcon from '@/components/icons/RulesetIcon';
import { Button } from '@/components/ui/button';
import { RulesetEnumHelper } from '@/lib/enum-helpers';
import { orpc } from '@/lib/orpc/orpc';
import type {
  BeatmapTournamentMatch,
  BeatmapTournamentUsage,
} from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';
import { formatUTCDate } from '@/lib/utils/date';
import { formatRankRange } from '@/lib/utils/number';

interface BeatmapTournamentCardProps {
  tournament: BeatmapTournamentUsage;
  beatmapOsuId: number;
}

export default function BeatmapTournamentCard({
  tournament,
  beatmapOsuId,
}: BeatmapTournamentCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [matches, setMatches] = useState<BeatmapTournamentMatch[] | null>(null);
  const [error, setError] = useState(false);
  const isVerified =
    tournament.tournament.verificationStatus === VerificationStatus.Verified;

  useEffect(() => {
    if (!isOpen || matches || error || !isVerified) return;

    let active = true;
    void orpc.beatmaps
      .tournamentMatches({
        beatmapId: beatmapOsuId,
        keyType: 'osu',
        tournamentId: tournament.tournament.id,
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
  }, [
    beatmapOsuId,
    error,
    isOpen,
    isVerified,
    matches,
    tournament.tournament.id,
  ]);

  const rulesetLabel =
    RulesetEnumHelper.getMetadata(tournament.tournament.ruleset).text.replace(
      'osu!',
      ''
    ) || 'osu!';
  const rankRange =
    tournament.rankRangeLowerBound === 1
      ? 'Open rank'
      : formatRankRange(tournament.rankRangeLowerBound);
  const usageDate =
    tournament.firstPlayedAt ??
    tournament.tournament.endTime ??
    tournament.tournament.startTime;
  const usageDateLabel = usageDate
    ? formatUTCDate(new Date(usageDate))
    : 'Unavailable';

  return (
    <article data-testid={`beatmap-tournament-row-${tournament.tournament.id}`}>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-muted/25 lg:grid-cols-[8.25rem_minmax(12rem,1fr)_11rem_5rem_7rem_7.5rem] lg:items-center lg:gap-3">
        <div className="col-span-2 min-w-0 lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href={`/tournaments/${tournament.tournament.id}`}
              prefetch={false}
              className="inline-flex min-w-0 items-center gap-1 rounded-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="truncate">{tournament.tournament.name}</span>
              <ArrowUpRight
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </Link>
            {tournament.tournament.abbreviation && (
              <span className="hidden shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums sm:inline">
                {tournament.tournament.abbreviation}
              </span>
            )}
            {tournament.tournament.isLazer && (
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                lazer
              </span>
            )}
          </div>
        </div>

        <div
          data-testid={`beatmap-tournament-verification-${tournament.tournament.id}`}
          data-verification-status={tournament.tournament.verificationStatus}
          className="col-start-1 row-start-2 min-w-0 lg:col-start-1 lg:row-start-1"
        >
          <VerificationBadge
            verificationStatus={tournament.tournament.verificationStatus}
            entityType="tournament"
            displayText
            minimal
          />
        </div>

        <div
          title={`${rulesetLabel}, ${tournament.tournament.lobbySize}v${tournament.tournament.lobbySize}, ${rankRange}`}
          className="col-span-2 row-start-3 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground lg:col-span-1 lg:col-start-3 lg:row-start-1"
        >
          <RulesetIcon
            ruleset={tournament.tournament.ruleset}
            className="size-3.5 shrink-0 fill-current"
            aria-hidden="true"
          />
          <span className="truncate">
            {rulesetLabel} · {tournament.tournament.lobbySize}v
            {tournament.tournament.lobbySize} · {rankRange}
          </span>
        </div>

        <div
          data-testid="beatmap-tournament-mod"
          className="col-start-1 row-start-4 flex h-5 w-20 items-center lg:col-start-4 lg:row-start-1 lg:w-16"
        >
          <ModIconset
            mods={tournament.mostCommonMod}
            freemod={tournament.mostCommonModFreemod}
            className="flex h-full items-center"
            iconClassName="h-5"
          />
        </div>

        <time
          dateTime={usageDate ?? undefined}
          title={
            tournament.firstPlayedAt
              ? `First played ${usageDateLabel}`
              : `Tournament date ${usageDateLabel}`
          }
          className="col-start-2 row-start-4 justify-self-end font-mono text-xs text-muted-foreground tabular-nums lg:col-start-5 lg:row-start-1 lg:justify-self-start"
        >
          {usageDateLabel}
        </time>

        <div className="col-start-2 row-start-2 flex items-center justify-end gap-1 lg:col-start-6 lg:row-start-1">
          <span
            aria-label={
              isVerified
                ? `${tournament.gameCount} verified ${tournament.gameCount === 1 ? 'game' : 'games'}`
                : 'No verified game count for this pool record'
            }
            className="min-w-7 text-right font-mono text-sm font-semibold tabular-nums"
          >
            {isVerified ? tournament.gameCount.toLocaleString() : '—'}
          </span>
          {isVerified && tournament.gameCount > 0 && (
            <Button
              data-testid={`beatmap-tournament-details-toggle-${tournament.tournament.id}`}
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`${isOpen ? 'Hide' : 'Show'} games for ${tournament.tournament.name}`}
              aria-expanded={isOpen}
              aria-controls={`tournament-matches-${tournament.tournament.id}`}
              onClick={() => setIsOpen((value) => !value)}
              className="size-7"
            >
              <ChevronDown
                className={cn(
                  'size-4 transition-transform',
                  isOpen && 'rotate-180'
                )}
                aria-hidden="true"
              />
            </Button>
          )}
        </div>
      </div>

      {isOpen && (
        <div
          id={`tournament-matches-${tournament.tournament.id}`}
          className="border-t bg-muted/15"
        >
          {!matches && !error && (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
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
                  <TournamentGameRow
                    key={game.gameId}
                    match={match}
                    game={game}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function TournamentGameRow({
  match,
  game,
}: {
  match: BeatmapTournamentMatch;
  game: BeatmapTournamentMatch['games'][number];
}) {
  return (
    <Link
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
          <Users className="size-3.5" aria-hidden="true" />
          {game.playerCount}
        </span>
        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
          <Target className="size-3.5" aria-hidden="true" />
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
  );
}
