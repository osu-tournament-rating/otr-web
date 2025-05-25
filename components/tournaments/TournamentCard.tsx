import { RulesetEnumHelper } from '@/lib/enums';
import { formatUTCDate } from '@/lib/utils/date';
import { formatRankRange } from '@/lib/utils/number';
import {
  AdminNoteRouteTarget,
  TournamentDTO,
} from '@osu-tournament-rating/otr-api-client';
import Link from 'next/link';
import AdminNoteView from '../admin-notes/AdminNoteView';
import VerificationBadge from '../badges/VerificationBadge';
import { Card, CardDescription, CardHeader } from '../ui/card';
import TournamentAdminView from './TournamentAdminView';

export default function TournamentCard({
  tournament,
  titleIsLink = false,
  displayStatusText = false,
  allowAdminView = false,
}: {
  tournament: TournamentDTO;

  /** If the title links to the tournament's page */
  titleIsLink?: boolean;

  /** If the verification status icon includes text */
  displayStatusText?: boolean;

  /** If the button to open the admin view is present */
  allowAdminView?: boolean;
}) {
  const startDate = new Date(tournament.startTime);
  const endDate = new Date(tournament.endTime);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <div className="flex gap-3">
            <div>
              <VerificationBadge
                verificationStatus={tournament.verificationStatus}
                rejectionReason={tournament.rejectionReason}
                entityType="tournament"
                displayText={displayStatusText}
              />
            </div>
            <div>
              <p className="text-muted-foreground">{tournament.abbreviation}</p>
            </div>
            <div>
              {titleIsLink ? (
                <Link href={`/tournaments/${tournament.id}`}>
                  <p className="font-bold">{tournament.name}</p>
                </Link>
              ) : (
                <p className="font-bold">{tournament.name}</p>
              )}
            </div>
          </div>
          {allowAdminView && (
            <div>
              <AdminNoteView
                notes={tournament.adminNotes ?? []}
                entity={AdminNoteRouteTarget.Tournament}
                entityId={tournament.id}
                entityDisplayName={tournament.name}
              />
              <TournamentAdminView tournament={tournament} />
            </div>
          )}
        </div>
        <CardDescription>
          <div className="flex items-baseline justify-between font-mono">
            <p>
              {RulesetEnumHelper.getMetadata(tournament.ruleset).text} •{' '}
              {tournament.lobbySize}v{tournament.lobbySize} •{' '}
              {formatRankRange(tournament.rankRangeLowerBound)}
            </p>
            <p className="text-xs">
              {formatUTCDate(startDate)} - {formatUTCDate(endDate)}
            </p>
          </div>
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
