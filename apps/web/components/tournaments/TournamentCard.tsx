import { RulesetEnumHelper } from '@/lib/enums';
import { formatUTCDate } from '@/lib/utils/date';
import { formatRankRange } from '@/lib/utils/number';
import { AdminNoteRouteTarget } from '@/lib/osu/enums';
import Link from 'next/link';
import { Users, Target, Calendar } from 'lucide-react';

import {
  TournamentAdminNote,
  TournamentDetail,
  TournamentListItem,
} from '@/lib/orpc/schema/tournament';

import AdminNoteView from '../admin-notes/AdminNoteView';
import VerificationBadge from '../badges/VerificationBadge';
import RulesetIcon from '../icons/RulesetIcon';
import { Card } from '../ui/card';
import TournamentAdminView from './TournamentAdminView';

type TournamentCardData =
  | (TournamentListItem & { adminNotes?: TournamentAdminNote[] })
  | TournamentDetail;

function formatRankRangeDisplay(rankRange: number): string {
  if (rankRange === 1) return 'Open';
  return formatRankRange(rankRange);
}

export default function TournamentCard({
  tournament,
  titleIsLink = false,
  displayStatusText = false,
  allowAdminView = false,
}: {
  tournament: TournamentCardData;

  /** If the title links to the tournament's page */
  titleIsLink?: boolean;

  /** If the verification status icon includes text */
  displayStatusText?: boolean;

  /** If the button to open the admin view is present */
  allowAdminView?: boolean;
}) {
  const startDate = tournament.startTime
    ? new Date(tournament.startTime)
    : null;
  const endDate = tournament.endTime ? new Date(tournament.endTime) : null;
  const adminNotes = tournament.adminNotes ?? [];
  const canShowAdminControls =
    allowAdminView && 'playerTournamentStats' in tournament;

  const cardContent = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <VerificationBadge
          verificationStatus={tournament.verificationStatus}
          rejectionReason={tournament.rejectionReason}
          entityType="tournament"
          displayText={displayStatusText}
        />
        <div className="flex w-full items-center justify-between sm:w-auto sm:justify-start sm:gap-3">
          <span className="font-mono text-sm text-muted-foreground">
            {tournament.abbreviation}
          </span>
          {allowAdminView && (
            <div className="flex gap-2">
              <AdminNoteView
                notes={adminNotes}
                entity={AdminNoteRouteTarget.Tournament}
                entityId={tournament.id}
                entityDisplayName={tournament.name}
              />
              {canShowAdminControls && (
                <TournamentAdminView tournament={tournament} />
              )}
            </div>
          )}
        </div>
      </div>

      <h2 className="text-lg leading-tight font-semibold sm:text-xl md:text-2xl">
        {tournament.name}
      </h2>

      <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        <div className="flex items-center gap-1.5">
          <RulesetIcon
            ruleset={tournament.ruleset}
            width={16}
            height={16}
            className="flex-shrink-0 fill-current"
          />
          <span className="truncate">
            {RulesetEnumHelper.getMetadata(tournament.ruleset).text}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 flex-shrink-0" />
          <span>
            {tournament.lobbySize}v{tournament.lobbySize}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Target className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">
            {formatRankRangeDisplay(tournament.rankRangeLowerBound)}
          </span>
        </div>

        {startDate && endDate && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className="truncate text-xs sm:text-sm">
              {formatUTCDate(startDate)} - {formatUTCDate(endDate)}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Card className="p-4 font-sans sm:p-6">
      {titleIsLink ? (
        <Link href={`/tournaments/${tournament.id}`} className="block">
          {cardContent}
        </Link>
      ) : (
        cardContent
      )}
    </Card>
  );
}
