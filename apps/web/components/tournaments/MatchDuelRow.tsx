'use client';

import Link from 'next/link';
import { StickyNote } from 'lucide-react';

import type { MatchRow } from '@/app/tournaments/[id]/columns';
import GamePipStrip from '@/components/badges/GamePipStrip';
import VerificationBadge from '@/components/badges/VerificationBadge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { VerificationStatusEnumHelper } from '@/lib/enum-helpers';
import { formatUTCDate } from '@/lib/utils/date';
import { Team } from '@otr/core/osu';

type Side = {
  team: Team | null;
  points: number;
  outcome: 'win' | 'loss' | 'draw';
};

/** Red on the left, blue on the right; a draw or a teamless match keeps the derived order. */
function orderSides(record: NonNullable<MatchRow['winRecord']>): [Side, Side] {
  const winner: Side = {
    team: record.winnerTeam,
    points: record.winnerPoints,
    outcome: record.isTied ? 'draw' : 'win',
  };
  const loser: Side = {
    team: record.loserTeam,
    points: record.loserPoints,
    outcome: record.isTied ? 'draw' : 'loss',
  };

  return record.winnerTeam === Team.Blue ? [loser, winner] : [winner, loser];
}

function teamLabel(team: Team | null) {
  if (team === Team.Red) return 'Red';
  if (team === Team.Blue) return 'Blue';
  return null;
}

function Numeral({ side, align }: { side: Side; align: 'start' | 'end' }) {
  const label = teamLabel(side.team);

  return (
    <div
      className={cn(
        'flex shrink-0 items-baseline gap-1.5',
        align === 'end' && 'flex-row-reverse'
      )}
    >
      <span
        className={cn(
          'w-5 text-2xl leading-none tabular-nums',
          align === 'end' && 'text-right',
          side.outcome === 'loss'
            ? 'font-medium text-muted-foreground'
            : 'font-bold text-foreground'
        )}
      >
        {side.points}
      </span>
      {label && (
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {label}
        </span>
      )}
    </div>
  );
}

export default function MatchDuelRow({
  match,
  isSelected,
  onSelect,
}: {
  match: MatchRow;
  isSelected?: boolean;
  onSelect?: (matchId: number, checked: boolean) => void;
}) {
  const record = match.winRecord;
  const sides = record ? orderSides(record) : null;
  const total = sides ? sides[0].points + sides[1].points : 0;
  const leftWidth = sides && total > 0 ? sides[0].points / total : 0.5;
  const noteCount =
    match.matchAdminNotes.length +
    match.games.filter((game) => game.adminNotes.length > 0).length;

  return (
    <div className="flex items-center gap-2">
      {onSelect && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(match.id, checked === true)}
          aria-label={`Select ${match.name || `match ${match.id}`}`}
        />
      )}
      <Link
        href={`/matches/${match.id}`}
        className="relative block min-w-0 flex-1 overflow-hidden rounded-lg border border-border/60 bg-card transition-colors hover:border-primary/50"
      >
        {sides && (
          <>
            <div
              className={cn(
                'absolute inset-y-0 left-0',
                sides[0].outcome === 'loss'
                  ? 'bg-destructive/10'
                  : 'bg-destructive/30'
              )}
              // Points split cannot be expressed as a utility.
              style={{ width: `${8 + 84 * leftWidth}%` }}
            />
            <div
              className={cn(
                'absolute inset-y-0 right-0',
                sides[1].outcome === 'loss' ? 'bg-primary/10' : 'bg-primary/30'
              )}
              style={{ width: `${8 + 84 * (1 - leftWidth)}%` }}
            />
            <div
              className={cn(
                'absolute inset-y-0 w-px',
                record?.isTied ? 'bg-foreground/40' : 'bg-foreground/15'
              )}
              style={{ left: `${8 + 84 * leftWidth}%` }}
            />
          </>
        )}

        <div className="relative flex items-center gap-3 px-3 py-2">
          {sides ? (
            <Numeral side={sides[0]} align="start" />
          ) : (
            <div className="w-5 shrink-0" />
          )}

          <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 text-center">
            <div className="flex w-full min-w-0 items-center justify-center gap-1.5">
              <span className="truncate text-sm font-medium">
                {match.name || `Match ${match.id}`}
              </span>
              {noteCount > 0 && (
                <StickyNote className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
            </div>
            <div className="flex w-full flex-wrap items-center justify-center gap-x-2 text-xs text-muted-foreground">
              <VerificationBadge
                verificationStatus={match.status.verificationStatus}
                warningFlags={match.status.warningFlags}
                rejectionReason={match.status.rejectionReason}
                entityType="match"
                size="small"
                minimal
                verifierUsername={match.status.verifiedByUsername ?? undefined}
              />
              <GamePipStrip games={match.games} />
              {record?.isTied && <span>Draw</span>}
              <span className="hidden sm:inline">
                {formatUTCDate(new Date(match.startDate))}
              </span>
            </div>
          </div>

          {sides ? (
            <Numeral side={sides[1]} align="end" />
          ) : (
            <span className="shrink-0 text-xs text-muted-foreground">
              {
                VerificationStatusEnumHelper.getMetadata(
                  match.status.verificationStatus
                ).text
              }
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}
