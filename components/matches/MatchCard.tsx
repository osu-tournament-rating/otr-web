import { MatchDTO } from '@osu-tournament-rating/otr-api-client';
import { Card, CardDescription, CardHeader } from '../ui/card';
import VerificationBadge from '../badges/VerificationBadge';
import Link from 'next/link';
import { formatUTCDate } from '@/lib/utils/date';
import AdminNoteView from '../admin-notes/AdminNoteView';
import MatchAdminView from './MatchAdminView';

export default function MatchCard({
  match,
  titleIsLink = false,
  displayStatusText = false,
  allowAdminView = false,
}: {
  match: MatchDTO;

  /** If the title links to the tournament's page */
  titleIsLink?: boolean;

  /** If the verification status icon includes text */
  displayStatusText?: boolean;

  /** If the button to open the admin view is present */
  allowAdminView?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <div className="flex gap-3">
            <div>
              <VerificationBadge
                verificationStatus={match.verificationStatus}
                displayText={displayStatusText}
              />
            </div>
            <div>
              {titleIsLink ? (
                <Link href={`/matches/${match.id}`}>
                  <p className="font-bold">{match.name}</p>
                </Link>
              ) : (
                <p className="font-bold">{match.name}</p>
              )}
            </div>
          </div>
          {allowAdminView && (
            <div>
              <AdminNoteView
                title={match.name}
                notes={match.adminNotes ?? []}
              />
              <MatchAdminView match={match} />
            </div>
          )}
        </div>
        <CardDescription>
          <div className="flex items-baseline justify-between font-mono">
            <p className="flex gap-2">
              <span>Played in </span>
              <Link
                className="font-bold"
                href={`/tournaments/${match.tournament?.id}`}
              >
                {match.tournament?.name}
              </Link>
            </p>
            <p className="text-xs">
              {formatUTCDate(new Date(match.startTime ?? ''))} -{' '}
              {formatUTCDate(new Date(match.startTime ?? ''))}
            </p>
          </div>
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
