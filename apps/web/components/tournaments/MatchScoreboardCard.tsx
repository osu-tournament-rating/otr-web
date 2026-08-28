'use client';

import Link from 'next/link';

import { Team } from '@otr/core/osu';
import type { MatchRow } from '@/app/tournaments/[id]/columns';
import VerificationBadge from '@/components/badges/VerificationBadge';
import BeatmapBackground from '@/components/games/BeatmapBackground';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { VerificationStatusEnumHelper } from '@/lib/enum-helpers';
import type { TournamentMatch } from '@/lib/orpc/schema/tournament';
import { cn } from '@/lib/utils';
import { formatUTCDate } from '@/lib/utils/date';
import MatchNotesIndicator from './MatchNotesIndicator';

export type MatchScoreboardRow = MatchRow & {
  winRecord: TournamentMatch['winRecord'];
  teams: { red: string; blue: string } | null;
  coverBeatmapsetId: number | null;
};

interface MatchScoreboardCardProps {
  match: MatchScoreboardRow;
  compact: boolean;
  isSelected?: boolean;
  onSelect?: (matchId: number, checked: boolean) => void;
}

function teamName(
  team: Team | null,
  teams: MatchScoreboardRow['teams'],
  fallback: string
) {
  if (team === Team.Red) {
    return teams?.red ?? 'Red';
  }

  if (team === Team.Blue) {
    return teams?.blue ?? 'Blue';
  }

  return fallback;
}

function TeamRow({
  name,
  team,
  points,
  isWinner,
  compact,
}: {
  name: string;
  team: Team | null;
  points: number;
  isWinner: boolean;
  compact: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border-l-2 py-1 pr-2 pl-2',
        isWinner ? 'bg-foreground/5' : 'border-transparent',
        isWinner && team === Team.Red && 'border-(--team-red)',
        isWinner && team === Team.Blue && 'border-(--team-blue)',
        isWinner && (team === null || team === Team.NoTeam) && 'border-primary'
      )}
    >
      <span
        className={cn(
          'min-w-0 flex-1 truncate',
          compact ? 'text-xs' : 'text-sm',
          isWinner ? 'font-semibold text-foreground' : 'text-muted-foreground'
        )}
      >
        {name}
      </span>
      <span
        className={cn(
          'tabular-nums',
          compact ? 'text-sm' : 'text-lg',
          isWinner
            ? 'font-bold text-foreground'
            : 'font-medium text-muted-foreground'
        )}
      >
        {points}
      </span>
    </div>
  );
}

export default function MatchScoreboardCard({
  match,
  compact,
  isSelected,
  onSelect,
}: MatchScoreboardCardProps) {
  const { winRecord, teams } = match;
  const games = [...match.games].sort((a, b) => {
    const startA = a.startTime ? new Date(a.startTime).getTime() : 0;
    const startB = b.startTime ? new Date(b.startTime).getTime() : 0;
    return startA - startB;
  });
  const showCover = !compact && match.coverBeatmapsetId !== null;
  const { text: statusText } = VerificationStatusEnumHelper.getMetadata(
    match.status.verificationStatus
  );
  const label = teams
    ? match.name.split(':')[0].trim() || `Match ${match.id}`
    : match.name || `Match ${match.id}`;

  return (
    <Card
      className={cn(
        'relative gap-0 overflow-hidden p-0 transition',
        isSelected
          ? 'border-primary ring-2 ring-primary/40'
          : 'hover:border-primary/50'
      )}
    >
      {showCover && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 scale-125 blur-md">
            <BeatmapBackground
              beatmapsetId={match.coverBeatmapsetId ?? undefined}
              alt=""
            />
          </div>
          <div className="absolute inset-0 bg-card/85" />
          <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
        </div>
      )}

      <Link
        href={`/matches/${match.id}`}
        aria-label={match.name || `Match ${match.id}`}
        className="absolute inset-0 z-10"
      />

      <div
        className={cn(
          'pointer-events-none relative z-20 flex flex-col',
          compact ? 'gap-2 p-2' : 'gap-3 p-3'
        )}
      >
        <div className="flex items-center gap-2">
          {onSelect && (
            <Checkbox
              className="pointer-events-auto"
              checked={isSelected}
              onCheckedChange={(checked) =>
                onSelect(match.id, checked === true)
              }
              aria-label={`Select ${match.name || `match ${match.id}`}`}
            />
          )}
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className="truncate text-xs font-medium text-muted-foreground">
              {label}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs whitespace-nowrap text-muted-foreground">
              {formatUTCDate(new Date(match.startDate))}
            </span>
            <div className="pointer-events-auto">
              <MatchNotesIndicator
                matchNotes={match.matchAdminNotes}
                games={match.games}
              />
            </div>
          </div>
          {winRecord?.isTied && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              Tied
            </span>
          )}
          <div className="pointer-events-auto">
            <VerificationBadge
              verificationStatus={match.status.verificationStatus}
              warningFlags={match.status.warningFlags}
              rejectionReason={match.status.rejectionReason}
              entityType="match"
              size="small"
              minimal
              verifierUsername={match.status.verifiedByUsername ?? undefined}
            />
          </div>
        </div>

        {winRecord ? (
          <div className="flex flex-col gap-1">
            {winRecord.isTied ? (
              <>
                <TeamRow
                  name={teamName(Team.Red, teams, 'Red')}
                  team={Team.Red}
                  points={winRecord.winnerPoints}
                  isWinner
                  compact={compact}
                />
                <TeamRow
                  name={teamName(Team.Blue, teams, 'Blue')}
                  team={Team.Blue}
                  points={winRecord.loserPoints}
                  isWinner
                  compact={compact}
                />
              </>
            ) : (
              <>
                <TeamRow
                  name={teamName(winRecord.winnerTeam, teams, 'Winner')}
                  team={winRecord.winnerTeam}
                  points={winRecord.winnerPoints}
                  isWinner
                  compact={compact}
                />
                <TeamRow
                  name={teamName(winRecord.loserTeam, teams, 'Runner-up')}
                  team={winRecord.loserTeam}
                  points={winRecord.loserPoints}
                  isWinner={false}
                  compact={compact}
                />
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-dashed px-2 py-3">
            <span className="max-w-full truncate text-sm text-muted-foreground">
              {teams
                ? `${teams.red} vs ${teams.blue}`
                : match.name || `Match ${match.id}`}
            </span>
            <span className="text-xs text-muted-foreground">
              No result · {statusText}
            </span>
          </div>
        )}

        <div className="flex items-end justify-between gap-2">
          <div className="pointer-events-auto flex flex-wrap items-center gap-1">
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
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {games.length} {games.length === 1 ? 'game' : 'games'}
          </span>
        </div>
      </div>
    </Card>
  );
}
