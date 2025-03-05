import { TournamentCompactDTO } from '@osu-tournament-rating/otr-api-client';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { rulesetString } from '@/lib/utils';
import VerificationBadge from '../verification/VerificationBadge';

export default function TournamentCard({
  tournament,
}: {
  tournament: TournamentCompactDTO;
}) {
  const date = new Date(tournament.startTime);

  return (
    <Card>
      <CardHeader>
        <div className="flex gap-3">
          <VerificationBadge
            verificationStatus={tournament.verificationStatus}
          />
          <CardTitle>{tournament.name}</CardTitle>
        </div>
        <CardDescription>
          <div className="flex font-mono justify-between">
            <p>
              {tournament.abbreviation} • {rulesetString(tournament.ruleset)} •{' '}
              {tournament.lobbySize}v{tournament.lobbySize} • #
              {tournament.rankRangeLowerBound}+
            </p>
            <p className="text-xs">{date.toUTCString()}</p>
          </div>
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
