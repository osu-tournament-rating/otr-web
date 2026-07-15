import {
  CalendarDays,
  ChevronRight,
  StickyNote,
  Target,
  Users,
} from 'lucide-react';
import { VerificationStatus } from '@otr/core/osu';

import AdminNoteContent from '@/components/admin-notes/AdminNoteContent';
import VerificationBadge from '@/components/badges/VerificationBadge';
import { LazerBadge } from '@/components/badges/LazerBadge';
import RulesetIcon from '@/components/icons/RulesetIcon';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RulesetEnumHelper } from '@/lib/enum-helpers';
import { type AdminNotePreview } from '@/lib/orpc/schema/common';
import { type TournamentListItem } from '@/lib/orpc/schema/tournament';
import { formatRankRange } from '@/lib/utils/number';

const monthDayFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

const fullDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatRankRangeDisplay(rankRange: number): string {
  return rankRange === 1 ? 'Open rank' : formatRankRange(rankRange);
}

function formatTournamentDates(
  startTime: Date | string | null,
  endTime: Date | string | null
): string {
  const startDate = startTime ? new Date(startTime) : null;
  const endDate = endTime ? new Date(endTime) : null;

  if (startDate && endDate) {
    const sameDay =
      startDate.getUTCFullYear() === endDate.getUTCFullYear() &&
      startDate.getUTCMonth() === endDate.getUTCMonth() &&
      startDate.getUTCDate() === endDate.getUTCDate();

    if (sameDay) {
      return fullDateFormatter.format(startDate);
    }

    if (startDate.getUTCFullYear() === endDate.getUTCFullYear()) {
      return `${monthDayFormatter.format(startDate)} – ${fullDateFormatter.format(endDate)}`;
    }

    return `${fullDateFormatter.format(startDate)} – ${fullDateFormatter.format(endDate)}`;
  }

  const availableDate = startDate ?? endDate;
  return availableDate
    ? fullDateFormatter.format(availableDate)
    : 'Dates unavailable';
}

function AdminNotesTooltip({
  notes,
  tournamentName,
}: {
  notes: AdminNotePreview[];
  tournamentName: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          data-testid="tournament-admin-notes-trigger"
          tabIndex={0}
          aria-label={`${notes.length} admin ${notes.length === 1 ? 'note' : 'notes'} for ${tournamentName}`}
          className="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <StickyNote className="size-4" aria-hidden="true" />
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        sideOffset={8}
        collisionPadding={16}
        hideArrow
        className="w-80 max-w-[calc(100vw-2rem)] border bg-popover p-0 text-sm text-popover-foreground shadow-lg"
      >
        <div
          data-testid="tournament-admin-notes-content"
          className="max-h-64 divide-y overflow-y-auto"
        >
          {notes.map((note) => (
            <div key={note.id} className="p-3">
              <AdminNoteContent note={note} authorLink={false} />
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export default function TournamentListRow({
  tournament,
}: {
  tournament: TournamentListItem;
}) {
  const dateRange = formatTournamentDates(
    tournament.startTime,
    tournament.endTime
  );
  const isAwaitingReview = ![
    VerificationStatus.Verified,
    VerificationStatus.Rejected,
  ].includes(tournament.verificationStatus);
  const rulesetLabel =
    RulesetEnumHelper.getMetadata(tournament.ruleset).text.replace(
      'osu!',
      ''
    ) || 'osu!';

  return (
    <div
      data-testid="tournament-card"
      className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_18rem_230px] lg:items-center lg:gap-5"
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <VerificationBadge
            verificationStatus={tournament.verificationStatus}
            rejectionReason={tournament.rejectionReason}
            entityType="tournament"
            verifierUsername={tournament.verifiedByUsername ?? undefined}
          />
          <h2 className="min-w-0 truncate text-base leading-snug font-semibold text-foreground transition-colors group-hover:text-primary sm:text-lg">
            {tournament.name}
          </h2>
          <span
            data-testid="tournament-abbreviation"
            className="shrink-0 font-mono text-xs text-muted-foreground"
          >
            {tournament.abbreviation}
          </span>
          <span
            data-testid="tournament-admin-note-slot"
            className="inline-flex size-5 shrink-0 items-center justify-center"
          >
            {tournament.adminNotes.length > 0 && (
              <AdminNotesTooltip
                notes={tournament.adminNotes}
                tournamentName={tournament.name}
              />
            )}
          </span>
        </div>
        {(isAwaitingReview || tournament.isLazer) && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {isAwaitingReview && (
              <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2 text-xs font-medium whitespace-nowrap text-warning">
                <span
                  className="size-1.5 rounded-full bg-current"
                  aria-hidden="true"
                />
                Awaiting review
              </span>
            )}
            {tournament.isLazer && <LazerBadge isLazer={tournament.isLazer} />}
          </div>
        )}
      </div>

      <div className="flex items-center gap-x-4 text-sm text-muted-foreground">
        <span className="inline-flex w-28 shrink-0 items-center gap-1.5">
          <RulesetIcon
            ruleset={tournament.ruleset}
            className="size-4 shrink-0 fill-current"
            aria-hidden="true"
          />
          {rulesetLabel}
        </span>
        <span className="inline-flex w-12 shrink-0 items-center gap-1.5">
          <Users className="size-4 shrink-0" aria-hidden="true" />
          {tournament.lobbySize}v{tournament.lobbySize}
        </span>
        <span className="inline-flex w-24 shrink-0 items-center gap-1.5">
          <Target className="size-4 shrink-0" aria-hidden="true" />
          {formatRankRangeDisplay(tournament.rankRangeLowerBound)}
        </span>
      </div>

      <div className="flex min-w-0 items-center justify-between gap-3 text-sm text-muted-foreground lg:justify-end">
        <span className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap lg:text-right">
          <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
          <span>{dateRange}</span>
        </span>
        <ChevronRight
          className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
