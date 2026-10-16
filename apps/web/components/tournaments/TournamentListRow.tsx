import {
  CalendarDays,
  ChevronRight,
  StickyNote,
  Target,
  Users,
} from 'lucide-react';

import AdminNoteContent from '@/components/admin-notes/AdminNoteContent';
import { DateRangeText } from '@/components/kit/format/DateRangeText';
import { RulesetName } from '@/components/kit/format/RulesetName';
import { RowListItem } from '@/components/kit/layout/RowList';
import { Badge } from '@/components/kit/status/Badge';
import { NotInRatings } from '@/components/kit/status/NotInRatings';
import { VerificationStatusIcon } from '@/components/kit/status/VerificationStatusIcon';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatLobbySize, formatRankRange } from '@/lib/kit/format/fields';
import { formatCountOf } from '@/lib/kit/format/number';
import { getRejectionReasonTexts } from '@/lib/kit/status/reasons';
import { isNotInRatingsYet } from '@/lib/kit/status/verification';
import { type AdminNotePreview } from '@/lib/orpc/schema/common';
import { type TournamentListItem } from '@/lib/orpc/schema/tournament';

/** Column widths of the row grid from `lg`, shared with the column labels. */
export const TOURNAMENT_ROW_COLUMNS =
  'lg:grid-cols-[minmax(0,1fr)_18rem_230px] lg:gap-5';

/**
 * A preview of the tournament's admin notes. The row is one link, so this is
 * a hover preview, not a button; the notes themselves open from the
 * tournament page's Admin menu.
 */
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
          aria-label={`${formatCountOf(notes.length, 'admin note')} for ${tournamentName}`}
          className="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
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

/**
 * One tournament in the list. The whole row opens the tournament, as it
 * always has, so the name is plain text and the status icon's tooltip opens
 * on hover; "Not in ratings yet" says the undecided states in words.
 */
export default function TournamentListRow({
  tournament,
}: {
  tournament: TournamentListItem;
}) {
  const notInRatings = isNotInRatingsYet(tournament.verificationStatus);

  return (
    <RowListItem
      href={`/tournaments/${tournament.id}`}
      linkLabel={`View ${tournament.name}`}
      data-testid="tournament-list-item"
    >
      <div
        data-testid="tournament-card"
        className={`grid gap-2 lg:items-center ${TOURNAMENT_ROW_COLUMNS}`}
      >
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <VerificationStatusIcon
              status={tournament.verificationStatus}
              rejectionReasons={getRejectionReasonTexts(
                'tournament',
                tournament.rejectionReason
              )}
              reviewer={tournament.verifiedByUsername ?? undefined}
              tooltip="hover"
            />
            <span
              data-row-title
              title={tournament.name}
              className="min-w-0 truncate text-base font-medium"
            >
              {tournament.name}
            </span>
            <span
              data-testid="tournament-abbreviation"
              className="shrink-0 text-xs text-muted-foreground"
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
          {(notInRatings || tournament.isLazer) && (
            <div className="mt-1 flex flex-wrap items-center gap-2 pl-6">
              <NotInRatings status={tournament.verificationStatus} />
              {tournament.isLazer && (
                <Badge variant="outline" size="sm">
                  lazer
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-6 text-sm text-muted-foreground lg:pl-0">
          <RulesetName ruleset={tournament.ruleset} className="lg:w-24" />
          <span className="inline-flex shrink-0 items-center gap-1.5 lg:w-12">
            <Users className="size-4 shrink-0" aria-hidden="true" />
            {formatLobbySize(tournament.lobbySize)}
          </span>
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Target className="size-4 shrink-0" aria-hidden="true" />
            {formatRankRange(tournament.rankRangeLowerBound)}
          </span>
        </div>

        <div className="flex min-w-0 items-center justify-between gap-3 pl-6 text-sm text-muted-foreground lg:justify-end lg:pl-0">
          <span className="inline-flex min-w-0 items-center gap-1.5 tabular-nums">
            <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
            <DateRangeText
              start={tournament.startTime}
              end={tournament.endTime}
            />
          </span>
          <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
        </div>
      </div>
    </RowListItem>
  );
}
