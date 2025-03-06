import { TournamentCompactDTO } from '@osu-tournament-rating/otr-api-client';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { rulesetString, verificationStatusString } from '@/lib/utils';
import VerificationBadge from '../verification/VerificationBadge';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import SimpleTooltip from '../simple-tooltip';

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
          <SimpleTooltip content={verificationStatusString(tournament.verificationStatus)}>
            <VerificationBadge
              verificationStatus={tournament.verificationStatus}
              text={true}
            />
          </SimpleTooltip>
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
