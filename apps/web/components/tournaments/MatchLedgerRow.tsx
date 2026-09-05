'use client';

import Link from 'next/link';
import { StickyNote } from 'lucide-react';

import type { MatchRow } from './matchRow';
import VerificationBadge from '@/components/badges/VerificationBadge';
import SimpleTooltip from '@/components/simple-tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { formatUTCTime } from '@/lib/utils/date';
import { VerificationStatusEnumHelper } from '@/lib/enum-helpers';
import { parseTeamNames } from '@/lib/utils/match';
import { cn } from '@/lib/utils';
import { Team, VerificationStatus } from '@otr/core/osu';

function Scoreline({ match }: { match: MatchRow }) {
  const winRecord = match.winRecord;

  if (!winRecord) {
    return (
      <SimpleTooltip
        content={
          match.status.verificationStatus === VerificationStatus.Verified
            ? 'No result yet — check back once stats are generated'
            : 'No result yet — the match is not verified'
        }
        triggerClassName="w-14 shrink-0 justify-center text-center text-sm text-muted-foreground/60"
      >
        &mdash;
      </SimpleTooltip>
    );
  }

  const tone = winRecord.isTied
    ? 'bg-muted text-muted-foreground'
    : winRecord.winnerTeam === Team.Red
      ? 'bg-red-500/10 text-red-600 dark:text-red-400'
      : winRecord.winnerTeam === Team.Blue
        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
        : 'bg-muted text-foreground';

  return (
    <SimpleTooltip
      content={
        winRecord.isTied
          ? 'Draw — some games may not have been counted, so this result is not accurate'
          : 'Points won across the verified games'
      }
      triggerClassName={cn(
        'w-14 shrink-0 justify-center rounded-md py-0.5 text-center text-sm font-semibold tabular-nums',
        tone
      )}
    >
      {winRecord.winnerPoints}&ndash;{winRecord.loserPoints}
    </SimpleTooltip>
  );
}

function MatchTitle({ match }: { match: MatchRow }) {
  const teams = parseTeamNames(match.name);

  if (!teams) {
    return (
      <span className="min-w-0 truncate">
        {match.name || `Match ${match.id}`}
      </span>
    );
  }

  const winRecord = match.winRecord;
  const decided =
    winRecord !== null &&
    !winRecord.isTied &&
    (winRecord.winnerTeam === Team.Red || winRecord.winnerTeam === Team.Blue);
  const blueWon = decided && winRecord.winnerTeam === Team.Blue;

  return (
    <>
      <span className={cn('min-w-0 truncate', decided && 'font-medium')}>
        {blueWon ? teams.blue : teams.red}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">vs</span>
      <span
        className={cn('min-w-0 truncate', decided && 'text-muted-foreground')}
      >
        {blueWon ? teams.red : teams.blue}
      </span>
    </>
  );
}

function Notes({ match }: { match: MatchRow }) {
  const gamesWithNotes = match.games.filter((game) => game.adminNotes.length);
  const hasMatchNotes = match.matchAdminNotes.length > 0;

  if (!hasMatchNotes && !gamesWithNotes.length) {
    return null;
  }

  return (
    <SimpleTooltip
      content={
        <div className="max-w-xs space-y-1 text-xs">
          {match.matchAdminNotes.map((note, index) => (
            <div key={`match-${index}`}>
              {note.note}
              <span className="text-muted-foreground">
                {' '}
                — {note.adminUsername}
              </span>
            </div>
          ))}
          {gamesWithNotes.flatMap((game) =>
            game.adminNotes.map((note, index) => (
              <div key={`game-${game.id}-${index}`}>
                {note.note}
                <span className="text-muted-foreground">
                  {' '}
                  — {note.adminUsername}
                </span>
              </div>
            ))
          )}
        </div>
      }
      triggerAriaLabel="Admin notes"
    >
      <StickyNote className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </SimpleTooltip>
  );
}

function GamePips({
  games,
  className,
}: {
  games: MatchRow['games'];
  className?: string;
}) {
  if (games.length === 0) {
    return null;
  }

  const counts = new Map<VerificationStatus, number>();
  for (const game of games) {
    counts.set(
      game.verificationStatus,
      (counts.get(game.verificationStatus) ?? 0) + 1
    );
  }

  const summary = [...counts]
    .map(
      ([status, count]) =>
        `${count} ${VerificationStatusEnumHelper.getMetadata(status).text.toLowerCase()}`
    )
    .join(', ');

  return (
    <div
      role="group"
      className={cn('flex flex-wrap items-center gap-0.5', className)}
      aria-label={`${games.length} ${games.length === 1 ? 'game' : 'games'}: ${summary}`}
    >
      {games.map((game, index) => (
        <VerificationBadge
          key={game.id}
          verificationStatus={game.verificationStatus}
          warningFlags={game.warningFlags}
          rejectionReason={game.rejectionReason}
          entityType="game"
          gameIndex={index}
          size="pip"
          minimal
        />
      ))}
    </div>
  );
}

interface MatchLedgerRowProps {
  match: MatchRow;
  isSelected: boolean;
  onSelect?: (matchId: number, checked: boolean) => void;
}

export default function MatchLedgerRow({
  match,
  isSelected,
  onSelect,
}: MatchLedgerRowProps) {
  const games = [...match.games].sort((a, b) => {
    const startA = a.startTime ? new Date(a.startTime).getTime() : 0;
    const startB = b.startTime ? new Date(b.startTime).getTime() : 0;
    return startA - startB;
  });
  const startedAt = match.startDate ? new Date(match.startDate) : null;

  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b border-border/40 px-3 py-1.5 text-sm transition-colors last:border-b-0 hover:bg-muted/50',
        isSelected && 'bg-primary/5'
      )}
    >
      {onSelect && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(match.id, checked === true)}
          aria-label={`Select ${match.name || `match ${match.id}`}`}
          className="shrink-0"
        />
      )}
      <Scoreline match={match} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <Link
            href={`/matches/${match.id}`}
            className="flex min-w-0 items-baseline gap-1.5 hover:underline"
          >
            <MatchTitle match={match} />
          </Link>
          <Notes match={match} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground lg:hidden">
          <span>
            {startedAt ? `${formatUTCTime(startedAt)} · ` : ''}
            {match.games.length} {match.games.length === 1 ? 'game' : 'games'}
          </span>
          <GamePips games={games} />
        </div>
      </div>
      <span className="shrink-0">
        <VerificationBadge
          verificationStatus={match.status.verificationStatus}
          warningFlags={match.status.warningFlags}
          rejectionReason={match.status.rejectionReason}
          entityType="match"
          verifierUsername={match.status.verifiedByUsername ?? undefined}
          size="small"
        />
      </span>
      <GamePips
        games={games}
        className="hidden w-72 shrink-0 self-stretch border-l pl-3 lg:flex"
      />
      <span className="hidden w-10 shrink-0 text-right text-xs text-muted-foreground tabular-nums lg:inline">
        {startedAt ? formatUTCTime(startedAt) : ''}
      </span>
    </div>
  );
}
