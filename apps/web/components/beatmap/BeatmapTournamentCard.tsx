'use client';

import { VerificationStatus } from '@otr/core/osu';
import {
  CalendarDays,
  ChevronDown,
  ExternalLink,
  Gamepad2,
  Loader2,
  Target,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import VerificationBadge from '@/components/badges/VerificationBadge';
import RulesetIcon from '@/components/icons/RulesetIcon';
import ModIconset from '@/components/icons/ModIconset';
import TierIcon from '@/components/icons/TierIcon';
import { LazerBadge } from '@/components/badges/LazerBadge';
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
import { getTierFromRating } from '@/lib/utils/tierData';

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
  const shouldDisplayVerificationBadge =
    tournament.tournament.verificationStatus !== VerificationStatus.Verified &&
    tournament.tournament.verificationStatus !== VerificationStatus.PreVerified;
  const hasTournamentBadges =
    shouldDisplayVerificationBadge || tournament.tournament.isLazer;

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
  const dates = formatDates(
    tournament.tournament.startTime,
    tournament.tournament.endTime
  );

  return (
    <article className="px-4 py-4 transition-colors hover:bg-muted/25 dark:hover:bg-secondary/45">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          {hasTournamentBadges && (
            <div className="flex flex-wrap items-center gap-2">
              {shouldDisplayVerificationBadge && (
                <VerificationBadge
                  verificationStatus={tournament.tournament.verificationStatus}
                  entityType="tournament"
                  displayText
                />
              )}
              {tournament.tournament.isLazer && (
                <LazerBadge isLazer={tournament.tournament.isLazer} />
              )}
            </div>
          )}
          <Link
            href={`/tournaments/${tournament.tournament.id}`}
            prefetch={false}
            className={cn(
              'inline-flex max-w-full items-center gap-1.5 rounded-sm font-semibold hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              hasTournamentBadges && 'mt-2'
            )}
          >
            <span className="truncate">{tournament.tournament.name}</span>
            <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
          </Link>
          {tournament.tournament.abbreviation && (
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              {tournament.tournament.abbreviation}
            </span>
          )}
        </div>

        {isVerified && tournament.gameCount > 0 && (
          <Button
            data-testid={`beatmap-tournament-details-toggle-${tournament.tournament.id}`}
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={isOpen}
            aria-controls={`tournament-matches-${tournament.tournament.id}`}
            onClick={() => setIsOpen((value) => !value)}
            className="shrink-0"
          >
            Games
            <ChevronDown
              className={cn('transition-transform', isOpen && 'rotate-180')}
              aria-hidden="true"
            />
          </Button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <RulesetIcon
            ruleset={tournament.tournament.ruleset}
            className="size-3.5 fill-current"
            aria-hidden="true"
          />
          {rulesetLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-3.5" aria-hidden="true" />
          {tournament.tournament.lobbySize}v{tournament.tournament.lobbySize}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Target className="size-3.5" aria-hidden="true" />
          {tournament.rankRangeLowerBound === 1
            ? 'Open rank'
            : formatRankRange(tournament.rankRangeLowerBound)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          {dates}
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <Gamepad2 className="size-3.5" aria-hidden="true" />
          {isVerified
            ? `${tournament.gameCount} ${tournament.gameCount === 1 ? 'game' : 'games'}`
            : 'Pool record only'}
        </span>
      </div>

      {isOpen && (
        <div
          id={`tournament-matches-${tournament.tournament.id}`}
          className="mt-4 rounded-lg border bg-background dark:bg-input/25"
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
  const tier =
    game.avgRating !== null ? getTierFromRating(game.avgRating) : null;

  return (
    <Link
      href={`/matches/${match.matchId}?gameId=${game.gameId}`}
      prefetch={false}
      className="group/game grid gap-2 px-3 py-3 transition-colors hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium group-hover/game:text-primary">
          {match.matchName}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Game {game.gameNumber}
          {match.startTime
            ? ` · ${formatUTCDate(new Date(match.startTime))}`
            : ''}
        </p>
      </div>
      <div className="flex h-5 w-14 items-center">
        <ModIconset
          mods={game.mods}
          freemod={game.freemod}
          className="flex h-full items-center"
          iconClassName="h-5"
        />
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground sm:justify-end">
        <span className="inline-flex items-center gap-1">
          {tier && (
            <TierIcon
              tier={tier.tier}
              subTier={tier.subTier}
              width={15}
              height={15}
              tooltip
            />
          )}
          {game.avgRating !== null
            ? `${game.avgRating.toLocaleString()} avg TR`
            : 'No TR'}
        </span>
        <span>
          {game.avgScore !== null
            ? `${game.avgScore.toLocaleString()} avg score`
            : 'No score'}
        </span>
      </div>
    </Link>
  );
}

function formatDates(start: string | null, end: string | null): string {
  if (!start && !end) return 'Dates unavailable';
  const formattedStart = start ? formatUTCDate(new Date(start)) : null;
  const formattedEnd = end ? formatUTCDate(new Date(end)) : null;
  if (formattedStart && formattedEnd)
    return `${formattedStart} – ${formattedEnd}`;
  return formattedStart ?? formattedEnd ?? 'Dates unavailable';
}
